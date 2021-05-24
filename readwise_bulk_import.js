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
    let parent = wfBook.getParent();

    const timeElapsed = Date.now();
    const today = new Date(timeElapsed);
    WF.setItemNote(parent, "Updated: " + today.toDateString())
    book.updated = new Date(book.updated)

    if (book.source_url == null){
        WF.setItemName(wfBook, book.title + ' #' + book.category)
    } else {
        WF.setItemName(wfBook, '<a href="' + book.source_url + '">' + book.title + '</a> #' + book.category)
    }

    WF.setItemNote(wfBook,'#' + book.author + " | Notes: " + book.num_highlights + " | Updated: " + book.updated.toDateString() + " | Book ID: " + book.id)
    
    var wfHighlights = []
    book.highlights.forEach((highlight) => { 
        highlight.updated = new Date(highlight.updated)
        wfHighlight = WF.createItem(WF.currentItem(),0) 
        WF.setItemName(wfHighlight, highlight.text) 
        WF.setItemNote(wfHighlight, "Added: " + highlight.updated.toDateString() + " | Note ID: " + highlight.id)
        wfHighlights.push(wfHighlight)
    });
    WF.moveItems(wfHighlights, wfBook)
}


async function addAllHighlightsToWorkflowy() {
    let highlightsByBook = await getAllHighlightsByBook();
    Object.keys(highlightsByBook).forEach(book_id => {
        let book = highlightsByBook[book_id];
        console.log("Adding '" + book.title + "' to WorkFlowy...");
        addBookToWF(book);
    });

    console.log("Import complete!");
}






// Create a request variable and assign a new XMLHttpRequest object to it.
var book_request = new XMLHttpRequest()

// Open a new connection, using the GET request on the URL endpoint
book_request.open('GET', 'https://readwise.io/api/v2/books/?num_highlights__gt=0&page_size=19&page=1', true)
book_request.setRequestHeader("Authorization", "Token XXX");
book_request.onload = function () {
    // Begin accessing JSON data here
    var data = JSON.parse(this.response)
    //console.log(data)

    getBooks(1)
    console.log("Importing...")

    var pageCount = Math.ceil(data.count/20)

    var i
    for (i=2; i<=pageCount; i++){
        setTimeout(getBooks, 60000, i)
    }
}
book_request.send()

function getBooks(pageNum){
    // Create a request variable and assign a new XMLHttpRequest object to it.
    var book_request = new XMLHttpRequest()

    // Open a new connection, using the GET request on the URL endpoint
    book_request.open('GET', `https://readwise.io/api/v2/books/?num_highlights__gt=0&page_size=20&page=${pageNum}`, true)
    book_request.setRequestHeader("Authorization", "Token XXX");
    book_request.onload = function () {
    // Begin accessing JSON data here
    var data = JSON.parse(this.response)
    //console.log(data)

    var results = data.results
    //console.log(results)

    if (book_request.status >= 200 && book_request.status < 400) {
        Object.values(results).forEach(val => {
            //console.log(val.title)
            //console.log(val.source_url)
            //console.log(val.author)
            //console.log(val.category)
            val.author = val.author.replaceAll(',', '#')
            val.author = val.author.replaceAll(' ', '_')
            val.author = val.author.replaceAll('.', '')
            val.author = val.author.replaceAll('#', ' #')

            wfBook = WF.createItem(WF.currentItem(),0)
            
            var parent = wfBook.getParent()
            const timeElapsed = Date.now();
            const today = new Date(timeElapsed);
            WF.setItemNote(parent, "Updated: " + today.toString())
            val.updated = new Date(val.updated)

            if (val.source_url == null){
                WF.setItemName(wfBook,val.title + ' #' + val.category)
            } else {
                WF.setItemName(wfBook,'<a href="' + val.source_url + '">' + val.title + '</a> #' + val.category)
            }
            WF.setItemNote(wfBook,'#' + val.author + " | Notes: " + val.num_highlights + " | Updated: " + val.updated.toDateString() + " | Book ID: " + val.id)
            
            if (val.num_highlights > 0){
                setTimeout(getHighlights, 1, val.id, wfBook)
            }
        });
    } else {
        console.log('error')
    }}

    // Send request
    book_request.send()
}

function getHighlights(bookID, wfNode){
    // Create a request variable and assign a new XMLHttpRequest object to it.
    var highlight_request = new XMLHttpRequest()

    // Open a new connection, using the GET request on the URL endpoint
    highlight_request.open('GET', `https://readwise.io/api/v2/highlights/?book_id=${bookID}`, false)
    highlight_request.setRequestHeader("Authorization", "Token XXX");
    highlight_request.onload = function () {
    // Begin accessing JSON data here
    var data = JSON.parse(this.response)
    //console.log(data)

    var results = data.results
    //console.log(results)

    if (highlight_request.status >= 200 && highlight_request.status < 400) {
        var highlights = []
        Object.values(results).forEach(val => {
            //console.log(val.book_id);
            //console.log(val.text);
            val.updated = new Date(val.updated)

            wfHighlight = WF.createItem(WF.currentItem(),0)
            WF.setItemName(wfHighlight, val.text)
            WF.setItemNote(wfHighlight, "Added: " + val.updated.toDateString() + " | Note ID: " + val.id)
            highlights.push(wfHighlight)
        });
        WF.moveItems(highlights, wfNode)
    } else {
        console.log('error')
    }}

    // Send request
    highlight_request.send()
}
