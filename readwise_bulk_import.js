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
    book.author = book.author.replaceAll(',', '#'); 
    book.author = book.author.replaceAll(' ', '_') 
    book.author = book.author.replaceAll('.', '') 
    book.author = book.author.replaceAll('#', ' #')

    let wfBook = WF.createItem(WF.currentItem(),0);
    newBookCount++;

    book.updated = new Date(book.updated)

    if (book.source_url == null){
        WF.setItemName(wfBook, book.title + ' #' + book.category)
    } else {
        WF.setItemName(wfBook, '<a href="' + book.source_url + '">' + book.title + '</a> #' + book.category)
    }

    WF.setItemNote(wfBook,'#' + book.author + " | Notes: " + book.num_highlights + " | Updated: " + book.updated.toDateString() + " | Book ID: " + book.id)
    
    var wfHighlights = []
    var doesBookHaveNotes = 0

    book.highlights.forEach((highlight) => { 
        highlight.highlighted_at = new Date(highlight.highlighted_at)
        wfHighlight = WF.createItem(WF.currentItem(),0) 
        newHighlightCount++
        WF.setItemName(wfHighlight, highlight.text) 
        WF.setItemNote(wfHighlight, "Location: " + highlight.location + " | Highlighted: " + highlight.highlighted_at.toDateString() + " | Note ID: " + highlight.id)
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
    WF.setItemNote(booksRoot, "Updated: " + today.toDateString() + "...\n\nWelcome! This page stores your entire Readwise library.\n\nTIPS/TRICKS\n- Don't change any of the imported bullets\n- (Use sub-bullets instead)\n- Use the tags below to navigate\n- <a href=\"https://github.com/zackdn/wf-readwise-integration\">Reach out with questions/support!</a>\n\nSHORTCUTS\nUse these shortcuts to navigate through your library, highlights, and notes:\n#books | #articles | #supplementals | #readwise_notes\n\n")
    
    console.log("Import complete!");
    
    alert(`Success!\n\nImported:\n- ${newBookCount} new library items\n- ${newHighlightCount} new highlights\n\nUpdated:\n- ${oldBookCount} existing library items\n- ${oldHighlightCount} existing highlights`)
}

let newBookCount = 0
let oldBookCount = 0
let newHighlightCount = 0
let oldHighlightCount = 0
let bookCountImported = 0
let booksRoot = WF.currentItem()

addAllHighlightsToWorkflowy()