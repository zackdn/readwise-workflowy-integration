/** Readwise Access Token from https://readwise.io/access_token */
let ACCESS_TOKEN = "XXX";

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
    let books = await getAllResults("books", {"page_size": 1000, "num_highlights__gt": 0});
    let highlights = await getAllResults("highlights", {"page_size": 1000});
    let highlightsByBook = {};

    // build map by book id
    books.forEach((book) => { book.highlights = []; highlightsByBook[book.id] = book; });

    // inject highlights into the corresponding book (or article, tweet, etc.)
    highlights.forEach((highlight) => { highlightsByBook[highlight.book_id].highlights.unshift(highlight)} );

    console.log(highlightsByBook)
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

function addBookToWF(book) {
    // Does this book exist already in the books already listed on this WF node?
    existingBook = bookArray.findIndex(x => x.bookID == book.id)
    
    book.author = book.author.replaceAll(',', '#'); 
    book.author = book.author.replaceAll(' ', '_') 
    book.author = book.author.replaceAll('.', '') 
    book.author = book.author.replaceAll('#', ' #')
    book.updated = new Date(book.updated)

    let wfBook

    if(existingBook != "-1"){ // This book exists already - just add the highlight as a child
        existingBook = bookArray.find(x => x.bookID == book.id).wfID
        existingBookName = bookArray.find(x => x.bookID == book.id).wfNamePlain
        
        wfBook = WF.getItemById(existingBook)
        oldBookCount++

        WF.setItemNote(wfBook,'#' + book.author + " | Notes: " + book.num_highlights + " | Updated: " + book.updated.toDateString() + " | Book ID: " + book.id)
    } else {
        wfBook = WF.createItem(WF.currentItem(),0);
        newBookCount++;

        if (book.source_url == null){
            WF.setItemName(wfBook, book.title + ' #' + book.category)
        } else {
            WF.setItemName(wfBook, '<a href="' + book.source_url + '">' + book.title + '</a> #' + book.category)
        }

        WF.setItemNote(wfBook,'#' + book.author + " | Notes: " + book.num_highlights + " | Updated: " + book.updated.toDateString() + " | Book ID: " + book.id)
    }
    var wfHighlights = []
    var doesBookHaveNotes = 0

    book.highlights.forEach((highlight) => { 
        highlight.updated = new Date(highlight.updated)
        wfHighlight = WF.createItem(WF.currentItem(),0) 
        newHighlightCount++
        WF.setItemName(wfHighlight, highlight.text) 
        WF.setItemNote(wfHighlight, "Added: " + highlight.updated.toDateString() + " | Note ID: " + highlight.id)
        wfHighlights.push(wfHighlight)
        
        if(highlight.note != ""){
            newNote = WF.createItem(wfHighlight,highlight.location)
            WF.setItemName(newNote, highlight.note + " #readwise_notes")
            doesBookHaveNotes = 1
        }
    });
    if(doesBookHaveNotes==1){
        WF.setItemName(wfBook, wfBook.getName().split(" #readwise_notes")[0] + " #readwise_notes")
    }
    WF.moveItems(wfHighlights, wfBook)
}


async function addAllHighlightsToWorkflowy() {
    let highlightsByBook = await getAllHighlightsByBook();
    Object.keys(highlightsByBook).forEach(book_id => {
        let book = highlightsByBook[book_id];
        console.log("Adding '" + book.title + "' to WorkFlowy...");
        addBookToWF(book);
    });

    const timeElapsed = Date.now();
    const today = new Date(timeElapsed);
    WF.setItemNote(WF.currentItem(), "Updated: " + today.toDateString() + "...\n\nWelcome! This page stores your entire Readwise library.\n\nTIPS/TRICKS\n- Don't change any of the imported bullets\n- (Use sub-bullets instead)\n- Use the tags below to navigate\n- <a href=\"https://github.com/zackdn/wf-readwise-integration\">Reach out with questions/support!</a>\n\nSHORTCUTS\nUse these shortcuts to navigate through your library, highlights, and notes:\n#books | #articles | #supplementals | #readwise_notes\n\n")

    console.log("Import complete!");
    alert(`Success!\n\nImported:\n- ${newBookCount} new library items\n- ${newHighlightCount} new highlights\n\nUpdated:\n- ${oldBookCount} existing library items\n- ${oldHighlightCount} existing highlights`)
}

let newBookCount = 0
let oldBookCount = 0
let newHighlightCount = 0
let oldHighlightCount = 0
let bookCountImported = 0
let booksRoot = WF.currentItem()
let booksList = booksRoot.getChildren()

bookListUpdated = booksRoot.getNote()

if(bookListUpdated != ""){
    bookListUpdated = bookListUpdated.split("Updated: ")[1]
    bookListUpdated = bookListUpdated.split("...")[0]
    bookListUpdated = new Date(bookListUpdated)
    bookListUpdated = bookListUpdated.toISOString()
} else {
    bookListUpdated = new Date("1980-01-01")
    bookListUpdated = bookListUpdated.toISOString()}

var bookArray = []

booksList.forEach(function(book){
    bookID = book.data.note.split("Book ID: ")[1]
    bookUpdated = book.data.note.split("Updated: ")[1]
    bookUpdated = bookUpdated.split(" | ")[0]

    var highlightArray = []
    var highlightsList = book.getChildren()

    // Create an array of the highlights that exist already for this book within WF
    highlightsList.forEach(function(highlight){
        highlightID = highlight.data.note.split("Note ID: ")[1]
        highlightUpdated = highlight.data.note.split("Added: ")[1]
        highlightUpdated = highlightUpdated.split(" | ")[0]

        arr = {
            wfID:               highlight.data.id, 
            wfName:             highlight.data.name, 
            wfNote:             highlight.data.note,
            highlightID:        highlightID,
            highlightUpdated:   highlightUpdated
        }
        highlightArray.push(arr)
    });

    arr = {
        wfID:           book.data.id, 
        wfName:         book.data.name, 
        wfNamePlain:    book.data.nameInPlainText, 
        wfNote:         book.data.note,
        bookID:         bookID,
        bookUpdated:    bookUpdated,
        highlights:     highlightArray
    }

    bookArray.push(arr)
});

console.log(bookArray)

addAllHighlightsToWorkflowy()