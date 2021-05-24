var newBookCount = 0
var oldBookCount = 0
var newHighlightCount = 0
var oldHighlightCount = 0

var booksRoot = WF.currentItem()
var booksList = booksRoot.getChildren()

bookListUpdated = booksRoot.getNote()
bookListUpdated = bookListUpdated.split("Updated: ")[1]
if(bookListUpdated != null){
    bookListUpdated = new Date(bookListUpdated)
    bookListUpdated = bookListUpdated.toISOString()
} else {
    bookListUpdated = new Date("1980-01-01")
    bookListUpdated = bookListUpdated.toISOString()}

console.log("Last updated: " + bookListUpdated)

var bookArray = []

booksList.forEach(function(book){
    bookID = book.data.note.split("Book ID: ")[1]
    bookUpdated = book.data.note.split("Updated: ")[1]
    bookUpdated = bookUpdated.split(" | ")[0]

    arr = {
        wfID:   book.data.id, 
        wfName: book.data.name, 
        wfNamePlain: book.data.nameInPlainText, 
        wfNote: book.data.note,
        bookID: bookID,
        bookUpdated: bookUpdated
    }
    bookArray.push(arr)
});

/* 

The following section calls the Books API so we can find out how many books we need to parse.

After the first call we need to delay the next calls by 60 seconds in order to account for the API limiting.

*/

var book_request = new XMLHttpRequest()
book_request.open('GET', `https://readwise.io/api/v2/books/?num_highlights__gt=0&updated__gt=${bookListUpdated}&page_size=1&page=1`, true)
book_request.setRequestHeader("Authorization", "Token XXX");
book_request.onload = function () {
    var data = JSON.parse(this.response)

    if(data.count>0){
        alert("This could take several minutes! Please leave this window open. You will receive a confirmation upon completion.\n\nThanks for using Readwise!")

        var booksAPICallsCount = 1
        console.log(`>> Running Books API (Nth time: ${booksAPICallsCount})`)

        booksAPICallsCount = 2
        console.log(`++ Calling Books API (Nth time: ${booksAPICallsCount})`)
        console.log(Math.floor(Date.now() / 1000))
        getBooks(1, bookListUpdated, 2)

        var pageCount = Math.ceil(data.count/20)
        
        if (pageCount>1){
            var counter = 0;
            var i = setInterval(function(){
                booksAPICallsCount++

                // Get 20 books at a time
                getBooks(counter+1, bookListUpdated, booksAPICallsCount)
                counter++;

                if(counter === pageCount) {
                    clearInterval(i);
                    settimeout(alert(`Success!\n\nImported:\n- ${newBookCount} new library items\n- ${newHighlightCount} new highlights\n\nUpdated:\n- ${oldBookCount} existing library items\n- ${oldHighlightCount} existing highlights`), 10000)
                }
            }, 65000);
        }
        
        var timeElapsed = Date.now();
        var today = new Date(timeElapsed);

        WF.setItemNote(booksRoot, "Updated: " + today.toString())
    } else {
        alert("There's nothing new to import today!")
    }
}
book_request.send()

/*

Every time we run getBooks() we are going to get a batch of books.

For every one of those books, we need to run getHighlights() in order to pull the highlights for that book.

Since Readwise only allows 20 calls to the Highlights API per minute, we need to limit ourselves to only pull 20 books at a time, which will result in 20 calls to the Highlights API.

*/
function getBooks(pageNum, lastUpdated, booksAPICallsCount){
    var book_request = new XMLHttpRequest()
    book_request.open('GET', `https://readwise.io/api/v2/books/?num_highlights__gt=0&updated__gt=${lastUpdated}&page_size=20&page=${pageNum}`, true)
    book_request.setRequestHeader("Authorization", "Token XXX");
    book_request.onload = function () {

        console.log(`>> Running Books API (Nth time: ${booksAPICallsCount})`)
        console.log(Math.floor(Date.now() / 1000))

        var data = JSON.parse(this.response)
        var highlightsAPICallsCount = 1

        data.results.forEach(function(result){
            // Does this book exist already in the books already listed on this WF node?
            existingBook = bookArray.findIndex(x => x.bookID == result.id)
            result.author = result.author.replaceAll(', ', '#')
            result.author = result.author.replaceAll(' ', '_')
            result.author = result.author.replaceAll('.', '')
            result.author = result.author.replaceAll('#', ' #')
            result.updated = new Date(result.updated)

            if(existingBook != "-1"){ // This book exists already - just add the highlight as a child
                existingBook = bookArray.find(x => x.bookID == result.id).wfID
                existingBookName = bookArray.find(x => x.bookID == result.id).wfNamePlain
                
                console.log("Old book: " + existingBookName + "!")

                oldBook = WF.getItemById(existingBook)
                oldBookCount++

                WF.setItemNote(oldBook,'#' + result.author + " | Notes: " + result.num_highlights + " | Updated: " + result.updated.toDateString() + " | Book ID: " + result.id)

                if (result.num_highlights > 0){
                    // Get the highlights for this book
                    console.log(`++ Calling Highlights API (Nth time: ${highlightsAPICallsCount})`)
                    console.log(Math.floor(Date.now() / 1000))
                    getHighlights(result.id, oldBook, bookListUpdated, highlightsAPICallsCount)
                }
            }
            else { // This book doesn't exist in this WF node - create a new book AND child highlights
                console.log("New book!")

                wfBook = WF.createItem(WF.currentItem(),0)
                newBookCount++

                if (result.source_url == null){
                    WF.setItemName(wfBook,result.title + ' #' + result.category)
                } else {
                    WF.setItemName(wfBook,'<a href="' + result.source_url + '">' + result.title + '</a> #' + result.category)
                }
                WF.setItemNote(wfBook,'#' + result.author + " | Notes: " + result.num_highlights + " | Updated: " + result.updated.toDateString() + " | Book ID: " + result.id)
                
                if (result.num_highlights > 0){
                    // Get the highlights for this book
                    console.log(`++ Calling Highlights API (Nth time: ${highlightsAPICallsCount})`)
                    console.log(Math.floor(Date.now() / 1000))
                    getHighlights(result.id, wfBook, bookListUpdated, highlightsAPICallsCount)
                }
            }
            highlightsAPICallsCount++
        })
    }

    book_request.send()
}

function getHighlights(bookID, wfNode, lastUpdated, highlightsAPICallsCount){
    
    var highlightArray = []
    var highlightsList = wfNode.getChildren()

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

    // console.log(highlightArray)

    var highlight_request = new XMLHttpRequest()
    highlight_request.open('GET', `https://readwise.io/api/v2/highlights/?book_id=${bookID}&updated__gt=${lastUpdated}`, true)
    highlight_request.setRequestHeader("Authorization", "Token XXX");
    highlight_request.onload = function () {
        
        console.log(`>> Running Highlights API (Nth time: ${highlightsAPICallsCount})`)
        console.log(Math.floor(Date.now() / 1000))
        
        var data = JSON.parse(this.response)

        // We are going to add all of our new WF highlights to this array.
        // This way we can move them as children under the book WF node.
        var highlights = []
        var doesBookHaveNotes = 0

        data.results.forEach(function(result){
            // Does this highlight exist already in the highlights already listed on this WF node?
            existingHighlight = highlightArray.findIndex(x => x.highlightID == result.id)

            result.updated = new Date(result.updated)

            if(existingHighlight != "-1"){ // This highlight exists already - just update the existing one
                existingHighlight = highlightArray.find(x => x.highlightID == result.id).wfID
                
                //console.log(existingHighlight)

                wfHighlight = WF.getItemById(existingHighlight)
                oldHighlightCount++

                WF.setItemName(wfHighlight, result.text)
                WF.setItemNote(wfHighlight, "Added: " + result.updated.toDateString() + " | Note ID: " + result.id)
                highlights.push(wfHighlight)

                if(result.note != ""){
                    newNote = WF.createItem(wfHighlight,0)
                    WF.setItemName(newNote, result.note)
                    doesBookHaveNotes = 1
                }
            } else{
                wfHighlight = WF.createItem(WF.currentItem(),0)
                newHighlightCount++
                WF.setItemName(wfHighlight, result.text)
                WF.setItemNote(wfHighlight, "Added: " + result.updated.toDateString() + " | Note ID: " + result.id)
                highlights.push(wfHighlight)

                if(result.note != ""){
                    newNote = WF.createItem(wfHighlight,0)
                    WF.setItemName(newNote, result.note)
                    doesBookHaveNotes = 1
                }
            }
        });
        if(doesBookHaveNotes==1){
            console.log(wfNode.getName().split(" #hasNotes")[0])
            WF.setItemName(wfNode, wfNode.getName().split(" #hasNotes")[0] + " #hasNotes")
        }
        // Move all the highlights as children of the book WF node
        WF.moveItems(highlights, wfNode)
    }

    highlight_request.send()
}
