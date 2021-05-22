# Workflowy/Readwise Integration

The contents of this file can be run directly in your browser console and it will import all of your Readwise highlights by book and import them into whatever WF node you have open at the time.

Readwise has a batch limit of 20 queries per minute on their book API and their highlights API, so my code runs in batches of 20 to import everything.

**IMPORTANT!** Make sure to replace the "XXX" in the two places where you see "Token XXX" with your own Readwise access token (found here: https://readwise.io/access_token).

## I could use your help!

This code is really rough (I'm not actually a developer) and I really need help making this better. I'd also REALLY like to write a script that will look at the "Updated: " text in the parent node note and then update the existing books with any new notes as well as add any new books that have been added since that date!

**Readwise API** 
https://readwise.io/access_token 

**WF Consumer-Side API** 
https://workflowy.com/s/B.dY94qOYbiG 
