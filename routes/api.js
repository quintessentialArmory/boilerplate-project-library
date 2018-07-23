'use strict';

const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
const ObjectID = mongo.ObjectID;

module.exports = async function (app, done) {
  const opts = { useNewUrlParser: true };
  const client = await MongoClient.connect(process.env.DB_URL, opts);
  const collection = client.db().collection(process.env.COLL_NAME);

  app.route('/api/books')
    .post( postBook(collection) )
    .get( getBookList(collection) )
    .delete( deleteAllBooks(collection) );

  app.route('/api/books/:_id')
    .get( getSingleBook(collection) )
    .delete( deleteSingleBook(collection) )
    .post( postComment(collection) );

  done();
};



// I can post a title to /api/books to add a book and returned will be the
// object with the title and a unique _id.
// route: /api/books
const postBook = collection => async function (req, res) {
  const title = req.body.title;
  if (typeof title === 'undefined' || title === '') {
    res.status(400).send('no title sent');
    return
  }
  if (typeof title !== 'string') {
    res.status(400).send('bad title sent');
    return
  }
  const book = { _id: new ObjectID(), title, comments: [] };
  try {
    await collection.insertOne(book);
  } catch (error) {
    console.error(error);
    res.status(500).send('error saving data');
    return
  }
  delete book.comments;
  res.json(book);
}

// I can get /api/books to retrieve an array of all books containing title, _id,
// & commentcount.
// route: /api/books
const getBookList = collection => async function (req, res) {
  //response will be array of book objects
  //json res format: [{"_id": bookid, "title": book_title, "commentcount": num_of_comments },...]
  const pipeline = [
    { "$match": { deleted_on: {"$exists": false} } },
    { "$project": {
      _id: true,
      title: true,
      commentcount: { "$size": "$comments" }
    }},
  ];
  let books;
  try {
    books = await collection.aggregate(pipeline).toArray();
  } catch (error) {
    console.error(error);
    res.status(500).send('error fetching data');
    return
  }
  res.json(books);
}

// I can send a delete request to /api/books to delete all books in the
// database. Returned will be 'complete delete successful' if successful.
// route: /api/books
const deleteAllBooks = collection => async function (req, res) {
  //if successful response will be 'complete delete successful'
  // facebook style of deletion
  const filter = { deleted_on: {"$exists": false} };
  const update = { "$set": {deleted_on: new Date()} };
  let result;
  try {
    result = await collection.updateMany(filter, update);
  } catch (error) {
    console.error(error);
    res.status(500).send('error deleting data');
    return
  }
  if (result.modifiedCount == 0) {
    res.status(404).send('no book deleted');
    return
  }
  res.send('complete delete successful');
};



// I can get /api/books/{_id} to retrieve a single object of a book containing
// title, _id, & an array of comments (empty array if no comments present).
// If I try to request a book that doesn't exist I will get a 'no book exists'
// message.
// route: /api/books/:_id
const getSingleBook = collection => async function (req, res) {
  const idStr = req.params._id;
  if (!ObjectID.isValid(idStr)) {
    res.status(400).send('_id error');
    return
  }
  const filter = { _id: new ObjectID(idStr), deleted_on: {"$exists": false} };
  let book;
  try {
    book = await collection.findOne(filter);
  } catch (error) {
    console.error(error);
    res.status(500).send('error fetching data');
    return
  }
  if (book === null) {
    res.status(404).send('no book with that _id');
    return
  }
  res.json(book);
}

// I can delete /api/books/{_id} to delete a book from the collection. Returned
// will be 'delete successful' if successful.
// route: /api/books/:_id
const deleteSingleBook = collection => async function (req, res) {
  //if successful response will be 'delete successful'
  const idStr = req.params._id;
  if (!ObjectID.isValid(idStr)) {
    res.status(400).send('_id error');
    return
  }
  // facebook style of deletion
  const update = { "$set": {deleted_on: new Date()} };
  const filter = { _id: new ObjectID(idStr), deleted_on: {"$exists": false} };
  let result;
  try {
    result = await collection.updateOne(filter, update);
  } catch (error) {
    console.error(error);
    res.status(500).send('error deleting data');
    return
  }
  if (result.modifiedCount == 0) {
    res.status(404).send('no book deleted');
    return
  }
  res.send('delete successful');
}

// I can post a comment to /api/books/{_id} to add a comment to a book and
// returned will be the books object similar to get /api/books/{_id}.
// route: /api/books/:_id
const postComment = collection => async function (req, res) {
  const idStr = req.params._id;
  if (!ObjectID.isValid(idStr)) {
    res.status(400).send('_id error');
    return
  }
  const comment = req.body.comment;
  if (typeof comment === 'undefined' || comment === '') {
    res.status(400).send('no comment sent');
    return
  }
  if (typeof comment !== 'string') {
    res.status(400).send('bad comment sent');
    return
  }
  const update = { "$push": {comments: comment} };
  const filter = { _id: new ObjectID(idStr), deleted_on: {"$exists": false} };
  let result;
  try {
    result = await collection.updateOne(filter, update);
  } catch (error) {
    console.error(error);
    res.status(500).send('error saving comment');
    return
  }
  if (result.modifiedCount == 0) {
    res.status(404).send('comment not saved');
    return
  }
  let book;
  try {
    book = await collection.findOne(filter);
  } catch (error) {
    console.error(error);
    res.send('error fetching data');
    return
  }
  res.json(book);
}
