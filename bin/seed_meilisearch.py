#!/usr/bin/env python3
# -*- coding: utf-8 -*-
#
# Copyright 2020 Marcel Bollmann <marcel@bollmann.me>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Usage: seed_meilisearch.py [options]

Options:
  --importdir=DIR          Directory to import XML files from. [default: {scriptdir}/../data/]
  --json                   Don't connect to MeiliSearch, just dump JSON files instead.
  --debug                  Output debug-level log messages.
  -h, --help               Display this helpful text.
"""

from docopt import docopt
from glob import glob
import json
import logging as log
from lxml import etree
import meilisearch
import os
import time

from anthology import Anthology
from anthology.utils import SeverityTracker


def prepare_meili_docs(anthology):
    docs = []
    for id_, paper in anthology.papers.items():
        check_id(id_.replace(".", "_"))
        author_ids = [
            anthology.people.resolve_name(*author).get("id")
            for author in paper.attrib.get("author", [])
        ]
        docs.append(
            {
                "id": id_.replace(".", "_"),
                "acl_id": id_,
                "title": paper.get_title(form="plain"),
                "abstract": paper.get_abstract(form="plain"),
                "author": paper.attrib.get("author_string", "").replace(", ", " ||| "),
                "author_ids": author_ids,
                "year": int(paper.attrib.get("year")),
                "venue": paper.get_booktitle(form="plain"),
                "thumbnail": paper.attrib.get("thumbnail"),
                "url": paper.attrib.get("url"),
                "pdf": paper.attrib.get("pdf"),
            }
        )
    return docs


def prepare_meili_authors(anthology):
    docs = []
    for id_ in anthology.people.personids():
        check_id(id_)
        docs.append(
            {
                "id": id_,
                "name": anthology.people.id_to_canonical[id_].full,
                "url": f"https://www.aclweb.org/anthology/people/{id_[0]}/{id_}",
                "pubcount": len(anthology.people.id_to_papers[id_]["author"])
                + len(anthology.people.id_to_papers[id_]["editor"]),
            }
        )
    return docs


def check_id(id_):
    """Checks if this is a valid MeiliSearch ID."""
    if all(c.isalnum() or c in ("-", "_") for c in id_):
        return True
    log.error(f"Not a valid ID: '{id_}'")
    return False


def client_has_index(client, uid):
    for index in client.get_indexes():
        if index.get("uid") == uid:
            return True
    return False


def perform_sync(action, index):
    ret = action()
    update_id = ret["updateId"]
    duration = None
    while True:
        actions = index.get_update_status(update_id)
        if actions.get("status") == "processed":
            duration = float(actions.get("duration"))
            break
        elif actions.get("status") == "failed":
            log.error(f"Action failed: {actions.get('error')}")
            duration = float(actions.get("duration"))
            break
        elif actions.get("status") != "enqueued":
            log.warning(f"Unknown status: {actions.get('status', 'None')}")
        time.sleep(1)
    return duration


def main(anthology, dump=False):
    if not dump:
        log.info("Connecting to MeiliSearch...")
        client = meilisearch.Client("http://127.0.0.1:7700")

    log.info("Indexing papers...")
    docs = prepare_meili_docs(anthology)

    if dump:
        with open("meili_papers.json", "w") as f:
            json.dump(docs, f)
    else:
        if client_has_index(client, "papers"):
            index = client.get_index("papers")
        else:
            index = client.create_index(uid="papers")
        duration = perform_sync(lambda: index.add_documents(docs), index)
        log.info(f"Done in {duration:.2f}s.")

    log.info("Indexing authors...")
    docs = prepare_meili_authors(anthology)
    if dump:
        with open("meili_people.json", "w") as f:
            json.dump(docs, f)
    else:
        if client_has_index(client, "people"):
            p_index = client.get_index("people")
        else:
            p_index = client.create_index(uid="people")
        duration = perform_sync(lambda: p_index.add_documents(docs), p_index)
        log.info(f"Done in {duration:.2f}s.")

    if not dump:
        log.info("Updating settings...")
        order = ["title", "abstract", "author", "venue", "year"]
        duration = perform_sync(
            lambda: index.update_searchable_attributes(order), index
        )
        duration += perform_sync(
            lambda: index.update_distinct_attribute("acl_id"), index
        )
        duration += perform_sync(
            lambda: p_index.update_searchable_attributes(["name"]), p_index
        )
        log.info(f"Done in {duration:.2f}s.")


if __name__ == "__main__":
    args = docopt(__doc__)
    scriptdir = os.path.dirname(os.path.abspath(__file__))
    if "{scriptdir}" in args["--importdir"]:
        args["--importdir"] = os.path.abspath(
            args["--importdir"].format(scriptdir=scriptdir)
        )

    log_level = log.DEBUG if args["--debug"] else log.INFO
    log.basicConfig(format="%(levelname)-8s %(message)s", level=log_level)
    tracker = SeverityTracker()
    log.getLogger().addHandler(tracker)

    log.info("Loading Anthology data...")
    if not args["--debug"]:
        log.getLogger().setLevel(log.ERROR)
    anthology = Anthology(importdir=args["--importdir"])
    log.getLogger().setLevel(log_level)

    main(anthology, dump=bool(args["--json"]))

    if tracker.highest >= log.ERROR:
        exit(1)
