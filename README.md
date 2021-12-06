# Workflowy/Readwise Integration

The contents of this file can be run directly in your browser console and it will import all of your Readwise highlights by book and import them into whatever WF node you have open at the time.

# Features

- **Bulk Import**
    - You can open a blank WF node and run the script to import your entire Readwise library!
- **Organization**
    - Every resource (books, articles, tweets, podcasts, etc.) will be a bullet...
        - With each highlight nested under the appropriate resource...
            - And each highlight's note nested under the highlight
- **Tagging**
    - Each book (or tweet, article, podcast, etc.) will be tagged with the kind of resource it is
    - Books containing personal notes on highlights will be tagged with "#readwise_notes"
- **Links and Other Meta**
    - Resources like articles that include a link will be automatically turned into a link in WF
    - Other useful meta like the author, date highlighted, and more are included as notes

# How to use:
- Get your Readwise token
- Download readwise_bulk_import_and_update.js
- Replace all three instances of “Token XXX” with “Token [your access code here]”
- Copy the entire contents of the file and paste them into a JS bookmarklet converter (I like this one)
- Drag the bookmarklet to your bookmarks bar
- Open a new, blank WF node
- Name it whatever you want
- Click the bookmarklet to import your notes!!!!

P.S. - The button also allows you to update your Readwise library with just a click

## I could use your help!

If you have any ideas for making this better, please reach out or fork away! 

**Readwise API** 
https://readwise.io/api_deets
https://readwise.io/access_token 

**WF Consumer-Side API** 
https://workflowy.com/s/B.dY94qOYbiG 
