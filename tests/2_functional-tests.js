/* global suite */         //analogous to describe
/* global test */          //analogous to it
/* global suiteSetup */    //analogous to before
/* global suiteTeardown */ //analogous to after
/* global setup */         //analogous to beforeEach
/* global teardown */      //analogous to afterEach

const ObjectID = require('mongodb').ObjectID;
const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);


suite('Functional Tests', function() {

  suite('Routing tests', function() {

    let testID; // for the "GET /api/books/:_id" test

    suite('POST /api/books with title => create book object/expect book object', function() {
      
      test('Test POST /api/books with title', function(done) {
        chai
          .request(server)
          .post('/api/books/')
          .send({ title: 'El Aleph' })
          .end((err, res) => {
            let text;
            assert.equal(res.status, 200, 'http status should be 200');
            text = 'response should have the book title';
            assert.equal(res.body.title, 'El Aleph', text);
            text = 'response should have a valid _id: '+res.body._id;
            assert.isTrue(ObjectID.isValid(res.body._id), text);
            text = 'response contains an unexpected field';
            assert.includeMembers(['_id','title'], Object.keys(res.body), text);

            testID = res.body._id; // save it for later

            done();
          });
      });

      test('Test POST /api/books with no title given', function(done) {
        chai
          .request(server)
          .post('/api/books/')
          .send({})
          .end((err, res) => {
            assert.equal(res.status, 400, 'http status should be 400');
            assert.equal(res.text, 'no title sent', 'bad response text');
            done();
          });
      });

    });

    suite('GET /api/books => array of books', function(){

      const testBooks = [
        { title: 'book1 (GET test)' },
        { title: 'book2 (GET test)' },
        { title: 'book3 (GET test)' },
        { title: 'book4 (GET test)' },
      ];
      suiteSetup(done => {
        Promise.all(testBooks.map(book => {
          const promise = chai
            .request(server)
            .post('/api/books')
            .send(book);
          return promise;
        }))
          .then(() => done())
          .catch(reason => {
            const msg = 'Something happened while posting the test books:\n';
            console.error(msg + reason);
            done(null);
         });
      });
      
      test('Test GET /api/books',  function(done){
        const allowedFields = ['_id', 'title', 'commentcount'];
        chai
          .request(server)
          .get('/api/books/')
          .end((err, res) => {
            let text;
            assert.equal(res.status, 200, 'http status should be 200');
            assert.isArray(res.body, 'response body should be an Array');
            for (let book of res.body) {
              text = 'at least one result contains an unexpected field';
              assert.includeMembers(allowedFields, Object.keys(book), text);

              text = 'response should have a valid _id: '+book._id;
              assert.isTrue(ObjectID.isValid(book._id), text);

              assert.isString(book.title, 'book title should be a string');
              text = 'commentcount should be a number';
              assert.isNumber(book.commentcount, text);
            }
            done();
          });
      });
      
    });

    suite('GET /api/books/[id] => book object with [id]', function(){
      
      test('Test GET /api/books/[id] with id not in db',  function(done){
        chai
          .request(server)
          .get('/api/books/'+ new ObjectID())
          .end((err, res) => {
            let text;
            assert.equal(res.status, 404, 'http status should be 404');
            text = 'bad response text';
            assert.equal(res.text, 'no book with that _id', text);
            done();
          });
      });
      
      test('Test GET /api/books/[id] with valid id in db',  function(done){
        const allowedFields = ['_id', 'title', 'comments'];
        chai
          .request(server)
          .get('/api/books/'+testID)
          .end((err, res) => {
            let text;
            assert.equal(res.status, 200, 'http status should be 200');
            const book = res.body;
            text = 'response contains an unexpected field';
            assert.includeMembers(allowedFields, Object.keys(book), text);
            text = 'response _id should be the requested one';
            assert.equal(book._id, testID, text);
            assert.isString(book.title, 'book title should be a string');
            assert.isArray(book.comments, 'comments should be an Array');
            let areStr = true;
            for (let comment of book.comments) {
              if (typeof comment !== 'string') {
                areStr = false;
                break;
              }
            }
            assert.isTrue(areStr, 'all the comments should be strings');
            done();
          });
      });
      
    });



    suite('POST /api/books/[id] => add comment/expect book object with id', function(){
      
      test('Test POST /api/books/[id] with comment', function(done){
        const allowedFields = ['_id', 'title', 'comments'];
        const comment = 'Nice book. But was Cantor a good singer?\n'
          + 'I guess we\'ll never know.';
        chai
          .request(server)
          .post('/api/books/'+ testID)
          .send({ comment })
          .end((err, res) => {
            let text;
            assert.equal(res.status, 200, 'http status should be 200');
            const book = res.body;
            text = 'response contains an unexpected field';
            assert.includeMembers(allowedFields, Object.keys(book), text);
            text = 'response _id should be the requested one';
            assert.equal(book._id, testID, text);
            assert.isString(book.title, 'book title should be a string');
            assert.isArray(book.comments, 'comments should be an Array');
            let areStr = true;
            for (let comment of book.comments) {
              if (typeof comment !== 'string') {
                areStr = false;
                break;
              }
            }
            assert.isTrue(areStr, 'all the comments should be strings');
            done();
          });
      });
      
    });

  });

});
