/** Readwise Access Token from https://readwise.io/access_token */
let ACCESS_TOKEN = "XXX"; // if not changed here, script will prompt for it.

let BASE_URL = "https://readwise.io/api/v2/";

/**
 * General purpose readwise request method.
 * Make a readwise request of type 'method' at the specified url with the provided data
 * 
 * @param {String} method http method: GET, POST, PUT, PATCH, DELETE
 * @param {String} url request url
 * @param {Object} params data parameters
 * @return {Promise}
 */
function readwiseRequest(method, url, params) {
    return Promise.resolve($.ajax({
        type: method,
        url: url,
        contentType: 'application/json',
        beforeSend: function (xhr) { 
            xhr.setRequestHeader('Authorization', 'Token ' + ACCESS_TOKEN);
        },
        data: params
    }));
}

/**
 * Retrieve all of the available results of type 'resource'.
 * 
 * @param {String} resource [Readwise resource to retrieve. ie. books, highlights]
 * @param {Object} params [Data object containing request parameters]
 * @return {Array} Collection of results where the type 'resource'
 */
async function getAllResults(resource, params) {
    let results = [];
    let url = BASE_URL + resource + "/";
    let complete = false;
    let num_tries = 0;
    let max_tries = 10;

    while(!complete && num_tries < max_tries) {
        num_tries += 1;

        try {
            let response = await readwiseRequest('GET', url, params);
            console.debug('Response:', response);

            if (response.results != null) {
                results.push(...response.results);
            }

            if (response.next == null) { 
                console.debug("All done.");
                complete = true;
            } else {
                console.debug("More to get...");
                url = response.next;
                params = null; // Params are already in the next url;
            }

        } catch (error) {
            console.log('Error:', error);
        }
    }

    return results;
}

/**
 * Build a map of highlights where the key is the book id and the value is a mashup of the book details and the highlights for that book.
 * 
 * @return {Object} The map of books with their highlights
 */
async function getAllHighlightsByBook() {
    let books = await getAllResults("books", {"page_size": 1000, "num_highlights__gt": 0, "updated__gt": bookListUpdated});
    let highlights = await getAllResults("highlights", {"page_size": 1000, "updated__gt": bookListUpdated});
    let highlightsByBook = {};

    // build map by book id
    books.forEach((book) => { book.highlights = []; highlightsByBook[book.id] = book; });

    // inject highlights into the corresponding book (or article, tweet, etc.)
    highlights.forEach((highlight) => { highlightsByBook[highlight.book_id].highlights.unshift(highlight)} );

    return highlightsByBook;
}


/**
 * Retrieve the updated books and highlights since the last time we checked.
 * 
 * @param {DateTime} lastUpdatedDate Retrieve updates since this date.  Example: "2020-11-20T05:45:48.143797Z"
 * @return {Object} The map of books with their highlights
 */
/*  // Haven't tested this yet...
function getUpdatedHighlightsByBook(lastUpdatedDate) {
    let books = await getAllResults("books", {"page_size": 1000, "num_highlights__gt": 0, "updated__gt": lastUpdatedDate});
    let highlights = await getAllResults("highlights", {"page_size": 1000, "updated__gt": lastUpdatedDate});

    // build map by book
    books.forEach((book) => { book.highlights = []; highlightsByBook[book.id] = book; });

    // fill in highlights by book
    highlights.forEach((highlight) => { highlightsByBook[highlight.book_id].highlights.unshift(highlight)} );

    return highlightsByBook;
}
*/


/*
function findReadwiseBullet() {
    // Maybe a top level readwise bullet for metadata, like the last time we checked?

}
*/

async function updateBookInWF(existingBookID, book){
    let highlightArray = []
    let highlightsList = WF.getItemById(existingBookID).getChildren()

    // Create an array of the highlights that exist already for this book within WF
    // We're going to use this array to check for existing highlights we need to update
    highlightsList.forEach(function(highlight){
        highlightID = highlight.data.note.split("Note ID: ")[1];
        highlightUpdated = highlight.data.note.split("Highlighted: ")[1];
        highlightUpdated = highlightUpdated.split(" | ")[0];
        highlightLocation = highlight.data.note.split("Location: ")[1];
        highlightLocation = parseInt(highlightLocation.split(" | ")[0]);

        arr = {
            wfID:               highlight.data.id, 
            wfName:             highlight.data.name, 
            wfNote:             highlight.data.note,
            highlightID:        highlightID,
            highlightedDate:    highlightUpdated,
            location:           highlightLocation
        }
        highlightArray.push(arr)
    });

    if (book.author) {
        book.author = book.author.replaceAll(',', '#'); 
        book.author = book.author.replaceAll(' ', '_') 
        book.author = book.author.replaceAll('.', '') 
        book.author = book.author.replaceAll('#', ' #')
    }
  
    book.updated = new Date(book.updated)

    wfBook = WF.getItemById(existingBookID)
    oldBookCount++
    
    let itemNotes = [];

    if (book.author) {
      if (book.author.startsWith("@")) { // Leave Twitter authors alone
        itemNotes.push(book.author);
      } else {
        itemNotes.push("#" + book.author);
      }
    }

    itemNotes.push("Notes: " + book.num_highlights);
    itemNotes.push("Updated: " + book.updated.toDateString());
    itemNotes.push("Resource ID: " + book.id);

    WF.setItemNote(wfBook, itemNotes.join(" | "));

    // We're going to add any new highlights we find to this array.
    // When we're done, we're going to sort them all by "Location", 
    // And use the wfMove function to rearrange them as necessary.
    let highlights = wfBook.getChildren();
    var bookHasNotes = false;

    book.highlights.forEach(function(highlight){
        // Does this highlight exist already in the highlights already listed on this WF node?
        existingHighlight = highlightArray.findIndex(x => x.highlightID == highlight.id)

        highlight.highlighted_at = new Date(highlight.highlighted_at)

        if(existingHighlight != "-1"){ // This highlight exists already - just update the existing one
            existingHighlight = highlightArray.find(x => x.highlightID == highlight.id).wfID
            
            wfHighlight = WF.getItemById(existingHighlight)
            oldHighlightCount++

            WF.setItemName(wfHighlight, highlight.text)

            itemNotes = [];
            if (highlight.location) {
                itemNotes.push("Location: " + highlight.location);
            }
    
            itemNotes.push("Highlighted: " + highlight.highlighted_at.toDateString());
            itemNotes.push("Note ID: " + highlight.id);
    
            highlight.tags = [];
            let noteWords = highlight.note.split(" ");
            noteWords.forEach(word => {
                if (word.startsWith(".")) {
                    highlight.tags.push(word.replaceAll(".", "#"));
                }
            });
    
            if (highlight.tags.length > 0) {
                itemNotes.push("Tags: " + highlight.tags.join(" "));
            }
    
            WF.setItemNote(wfHighlight, itemNotes.join(" | "));
    
            
            if (highlight.note != ""){
                allNotes = wfHighlight.getChildren()

                allNotes.forEach(function(note){
                    noteTag = WF.getItemTags(note)
                    noteTag = noteTag[0]["tag"]

                    if(noteTag == "#readwise_notes"){
                        WF.setItemName(note, highlight.note + " #readwise_notes")
                        bookHasNotes = true;
                    }
                })
            }
        } else { // This highlight doesn't exist - create a new one
            wfHighlight = WF.createItem(WF.currentItem(), 0)
            newHighlightCount++
            WF.setItemName(wfHighlight, highlight.text)
            
            itemNotes = [];
            if (highlight.location) {
                itemNotes.push("Location: " + highlight.location);
            }
    
            itemNotes.push("Highlighted: " + highlight.highlighted_at.toDateString());
            itemNotes.push("Note ID: " + highlight.id);
    
            highlight.tags = [];
            let noteWords = highlight.note.split(" ");
            noteWords.forEach(word => {
                if (word.startsWith(".")) {
                    highlight.tags.push(word.replaceAll(".", "#"));
                    noteTags.push(word.replaceAll(".", "#"));
                }
            });
    
            if (highlight.tags.length > 0) {
                itemNotes.push("Tags: " + highlight.tags.join(" "));
            }
    
            WF.setItemNote(wfHighlight, itemNotes.join(" | "));
            highlights.push(wfHighlight)

            if (highlight.note != ""){
                newNote = WF.createItem(wfHighlight,highlight.location)
                WF.setItemName(newNote, highlight.note + " #readwise_notes")
                bookHasNotes = true;
            }
        }
    });
    
    if (bookHasNotes){
        WF.setItemName(wfBook, wfBook.getName().split(" #readwise_notes")[0] + " #readwise_notes")
    }
    
    // Credit to rawbytz (https://github.com/rawbytz/sort) for the code to sort the bullets
    highlights.sort(function(a, b){
        a = a.getNote().split("Location: ")[1].split(" | ")[0];
        b = b.getNote().split("Location: ")[1].split(" | ")[0];

        return a - b;
    });
    
    WF.editGroup(() => {
        highlights.forEach((highlight, i) => {
        if (highlight.getPriority() !== i) WF.moveItems([highlight], wfBook, i);
        });
    });
}

async function addBookToWF(book) {
    if (book.author) {
      book.author = book.author.replaceAll(',', '#'); 
      book.author = book.author.replaceAll(' ', '_') 
      book.author = book.author.replaceAll('.', '') 
      book.author = book.author.replaceAll('#', ' #')
    }

    let wfBook = WF.createItem(WF.currentItem(),0);
    newBookCount++;

    book.updated = new Date(book.updated)

    if (book.source_url == null){
        WF.setItemName(wfBook, book.title + ' #' + book.category)
    } else {
        WF.setItemName(wfBook, '<a href="' + book.source_url + '">' + book.title + '</a> #' + book.category)
    }

    let itemNotes = [];

    if (book.author) {
      if (book.author.startsWith("@")) { // Leave Twitter authors alone
        itemNotes.push(book.author);
      } else {
        itemNotes.push("#" + book.author);
      }
    }

    itemNotes.push("Notes: " + book.num_highlights);
    itemNotes.push("Updated: " + book.updated.toDateString());
    itemNotes.push("Resource ID: " + book.id);

    WF.setItemNote(wfBook, itemNotes.join(" | "));

    let wfHighlights = []
    var bookHasNotes = false;

    book.highlights.forEach((highlight) => { 
        highlight.highlighted_at = new Date(highlight.highlighted_at)
        wfHighlight = WF.createItem(WF.currentItem(),0) 
        newHighlightCount++
        WF.setItemName(wfHighlight, highlight.text) 

        itemNotes = [];
        if (highlight.location) {
            itemNotes.push("Location: " + highlight.location);
        }

        itemNotes.push("Highlighted: " + highlight.highlighted_at.toDateString());
        itemNotes.push("Note ID: " + highlight.id);

        highlight.tags = [];
        let noteWords = highlight.note.split(" ");
        noteWords.forEach(word => {
            if (word.startsWith(".")) {
                highlight.tags.push(word.replaceAll(".", "#"));
                noteTags.push(word.replaceAll(".", "#"));
            }
        });

        if (highlight.tags.length > 0) {
            itemNotes.push("Tags: " + highlight.tags.join(" "));
        }

        WF.setItemNote(wfHighlight, itemNotes.join(" | "));
        wfHighlights.push(wfHighlight)
        
        if (highlight.note != ""){
            newNote = WF.createItem(wfHighlight,highlight.location)
            WF.setItemName(newNote, highlight.note + " #readwise_notes")
            bookHasNotes = true;
        }
    });

    if (bookHasNotes){
        WF.setItemName(wfBook, wfBook.getName().split(" #readwise_notes")[0] + " #readwise_notes")
    }
    WF.moveItems(wfHighlights, wfBook);
}


async function addAllHighlightsToWorkflowy() {
    let highlightsByBook = await getAllHighlightsByBook();
    let currentBook = 0;
    let totalBooks = Object.keys(highlightsByBook).length;
    Object.keys(highlightsByBook).forEach(book_id => {
        ++currentBook;
        let book = highlightsByBook[book_id];
        console.log("(" + currentBook + "/" + totalBooks + "): Adding '" + book.title + "' to WorkFlowy...");
        
        // Does this book exist already in the books already listed in this WF node?
        existingBook = bookArray.findIndex(x => x.bookID == book.id)
        if (existingBook != "-1"){
            existingBookID= bookArray.find(x => x.bookID == book.id).wfID;
        }

        existingBook != "-1" ? updateBookInWF(existingBookID, book) : addBookToWF(book);
    });

    const timeElapsed = Date.now();
    const today = new Date(timeElapsed);
    WF.setItemNote(booksRoot, `Updated: ${today.toISOString()}...\n\nWelcome! This page stores your entire Readwise library.\n\nTIPS/TRICKS\n- Don't change any of the imported bullets\n- (Use sub-bullets instead)\n- Use the tags below to navigate\n- <a href=\"https://github.com/zackdn/wf-readwise-integration\">Reach out with questions/support!</a>\n\nSHORTCUTS\nUse these shortcuts to navigate through your library, highlights, and notes:\n#books | #articles | #supplementals | #tweets | #readwise_notes\n\n`);
    
    // TODO: Add section in description for highlight tags via user's notes

    /* WF.setItemNote(booksRoot, `Updated: ${today.toDateString()}...\n\nWelcome! This page stores your entire Readwise library.\n\nTIPS/TRICKS\n- Don't change any of the imported bullets\n- (Use sub-bullets instead)\n- Use the tags below to navigate\n- <a href=\"https://github.com/zackdn/wf-readwise-integration\">Reach out with questions/support!</a>\n\nSHORTCUTS\nUse these shortcuts to navigate through your library, highlights, and notes:\n#books | #articles | #supplementals | #tweets | #readwise_notes\n\nYOUR NOTE TAGS\nUse these shortcuts to find highlights you've tagged via your notes:\n${noteTags.join(" ")}`);*/

    console.log("Import complete!");
    WF.showAlertDialog(`<strong>Success!</strong><br /><br /><strong>Imported:</strong><br />- ${newBookCount} new library items<br />- ${newHighlightCount} new highlights<br /><br /><strong>Updated:</strong><br />- ${oldBookCount} existing library items<br />- ${oldHighlightCount} existing highlights`)
}

let newBookCount = 0
let oldBookCount = 0
let newHighlightCount = 0
let oldHighlightCount = 0
let bookCountImported = 0
let booksRoot = WF.currentItem()

// TODO: Flesh this feature out more.
// It will add all the user's highlight tags via their notes on initial import, but what about when updating?
// And what about de-duping highlights that are used more than once throughout the notes?
let noteTags = [] 

bookListUpdated = booksRoot.getNote()

if(bookListUpdated != ""){
    bookListUpdated = bookListUpdated.split("Updated: ")[1]
    bookListUpdated = bookListUpdated.split("...")[0]
    bookListUpdated = new Date(bookListUpdated)
    bookListUpdated = bookListUpdated.toISOString()
} else {
    bookListUpdated = new Date("1980-01-01")
    bookListUpdated = bookListUpdated.toISOString()}

let bookArray = []
let booksList = booksRoot.getChildren()

booksList.forEach(function(book){
    bookID = book.data.note.split("Resource ID: ")[1]
    bookUpdated = book.data.note.split("Updated: ")[1]
    bookUpdated = bookUpdated.split(" | ")[0]

    arr = {
        wfID:           book.data.id, 
        wfName:         book.data.name, 
        wfNamePlain:    book.data.nameInPlainText, 
        wfNote:         book.data.note,
        bookID:         bookID,
        bookUpdated:    bookUpdated
    }

    bookArray.push(arr)
});

if (ACCESS_TOKEN == "XXX") {
    ACCESS_TOKEN = prompt("Enter Readwise Access Token from https://readwise.io/access_token");
}

addAllHighlightsToWorkflowy()