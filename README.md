# ACL Anthology Search Prototype

A search engine prototype for the ACL Anthology.

~Currently hosted at [https://aclfind.uber.space/](https://aclfind.uber.space/).~

## Installation

To set up an instance of the search engine on a local server:

1. Install [MeiliSearch](https://www.meilisearch.com/).

2. Clone the [ACL Anthology
repository](https://github.com/acl-org/acl-anthology/) and create the following symlinks:

   + `ln -s /pathto/acl-anthology/bin/anthology bin/anthology`
   + `ln -s /pathto/acl-anthology/data/ data`

3. With MeiliSearch running in development mode, run `bin/seed_meilisearch.py`
   to create the database from the data in the ACL Anthology repo.

4. When running MeiliSearch in production mode, replace the `publicKey` variable
   in `html/js/search.js` with the public key you generated for your MeiliSearch
   instance.

5. Run a web server and point it to the contents of `html/`.

Done!
