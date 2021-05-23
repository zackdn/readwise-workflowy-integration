// Create a request variable and assign a new XMLHttpRequest object to it.
var book_request = new XMLHttpRequest()

// Open a new connection, using the GET request on the URL endpoint
book_request.open('GET', 'https://readwise.io/api/v2/books/?num_highlights__gt=0&page_size=19&page=1', true)
book_request.setRequestHeader("Authorization", "Token uEbL9EACPBRXwP42bYLOBoDLaY5WV09VLA41mzmTOKdIchYPrs");
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
