# What is this?

This site hosts a prototype of a search engine for the [ACL
Anthology](https://www.aclweb.org/anthology/).  Here's what it can (and cannot)
do:

+ It **searches in author, title, and abstracts** of _all_ papers in the ACL
  Anthology.  In addition to papers, it also returns matching author profile
  pages (though this is currently limited to the top five results).

+ It **cannot perform fulltext search within papers.**
  The search engine backend, [MeiliSearch](https://www.meilisearch.com/), isn't
  really intended for this kind of task, so while it's theoretically possible to
  add the fulltext of all PDFs, performance will likely suffer a lot.  I have
  tried to do this, but the database becomes too huge (10GB+) to host on my
  current hosting provider.

+ It can currently _only_ **sort by relevance.** For example, it's not possible
  to sort results by year of publication.  That cannot currently be implemented
  with the MeiliSearch backend, but this might change with future releases.

+ It does not currently support any advanced **query syntax.** For example, you
  can't search _only_ in titles, or _only_ in abstracts.  This is just due to my
  laziness to build an interface for it, and could be added in the future.  The
  same goes for **pagination** in order to browse more than just the first _n_
  results.


## Where do the abstracts come from?

The ACL Anthology currently only has abstracts for the most recent conferences
([example](https://www.aclweb.org/anthology/P19-1001/)).  For this search engine
demo, I heuristically extracted abstracts for 38,523 additional papers by
combining data from the [ACL Anthology Reference
Corpus](https://acl-arc.comp.nus.edu.sg/) and my own hacky pipeline of extracting
abstracts from PDFs.

The results are **noisy and imperfect**, which is why they are not part of the
official ACL Anthology yet.  [We are working on it,
though.](https://github.com/acl-org/acl-anthology/issues/395)


## How does this work?

The [source code for this website is on
GitHub](https://github.com/mbollmann/aclfind).

It relies on [MeiliSearch](https://www.meilisearch.com/), a search engine
backend written in Rust that is intended to be simple to set up and use.  The
data comes from the [official ACL Anthology
repository](https://github.com/acl-org/acl-anthology/) and is indexed into
MeiliSearch by [a relatively simple Python
script](https://github.com/mbollmann/aclfind/blob/master/bin/seed_meilisearch.py).
Finally, the search engine and its frontpage are hosted by the amazing
[Uberspace](https://uberspace.de/en/).


## Why isn't this part of the ACL Anthology website?

First, this is a prototype (for now).

Second, we are currently still looking into different options and alternatives
for a better search engine than [the current Google-based one we
have](https://www.aclweb.org/anthology/search/?q=bert).

Third, and maybe most importantly, this solution requires running additional
server-side software, which makes it non-trivial to set up.  (The current ACL
Anthology website consists only of static HTML pages.)


## Who made this?

I'm [Marcel Bollmann](https://marcel.bollmann.me/), and I've already worked a lot on the ACL Anthology website when it got a makeover in the beginning of 2019.  I'm happy to take feedback on this prototype, ideally via [GitHub](https://github.com/mbollmann/aclfind/issues) or [Twitter](https://twitter.com/mmbollmann)!
