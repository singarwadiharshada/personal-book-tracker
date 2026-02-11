from flask import Flask, request, jsonify
from flask_cors import CORS 
from datetime import datetime
import requests
import json
import os

app = Flask(__name__)
CORS(app)

# Simple JSON file database
DB_FILE = 'books.json'

def load_books():
    """Load books from JSON file"""
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_books(books):
    """Save books to JSON file"""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(books, f, indent=2, ensure_ascii=False)

@app.route('/')
def home():
    return jsonify({
        "message": "📚 Personal Book Tracker API",
        "version": "2.0",
        "features": [
            "Search Open Library",
            "Save favorites",
            "Custom books",
            "Ratings & reviews",
            "Reading status",
            "Progress tracking",
            "Export/Import"
        ],
        "endpoints": {
            "GET /api/books": "Get all saved books",
            "POST /api/books": "Save a book",
            "PUT /api/books/<id>": "Update book (rating, status, progress)",
            "DELETE /api/books/<id>": "Remove a book",
            "GET /api/books/search?q=query": "Search Open Library",
            "GET /api/health": "Health check"
        }
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "database": "JSON file",
        "books_count": len(load_books())
    })

@app.route('/api/books', methods=['GET'])
def get_books():
    """Get all saved books"""
    try:
        books = load_books()
        return jsonify(books), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/books', methods=['POST'])
def save_book():
    """Save a new book"""
    try:
        data = request.json
        
        if not data or 'key' not in data:
            return jsonify({"error": "Invalid book data"}), 400
        
        books = load_books()
        
        # Check if already exists
        for book in books:
            if book.get('key') == data['key']:
                return jsonify({
                    "message": "Book already saved",
                    "id": book.get('id')
                }), 200
        
        # Add metadata
        data['id'] = len(books) + 1
        data['saved_at'] = datetime.utcnow().isoformat()
        data['updated_at'] = datetime.utcnow().isoformat()
        
        # Default values for new books
        if 'rating' not in data:
            data['rating'] = 0
        if 'status' not in data:
            data['status'] = 'want-to-read'
        if 'progress' not in data:
            data['progress'] = 0
        if 'notes' not in data:
            data['notes'] = ''
        if 'categories' not in data:
            data['categories'] = []
        
        books.append(data)
        save_books(books)
        
        return jsonify({
            "message": "✅ Book saved successfully!",
            "id": data['id']
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """Update book details (rating, status, progress, notes)"""
    try:
        books = load_books()
        data = request.json
        
        for i, book in enumerate(books):
            if book.get('id') == book_id:
                # Update fields
                if 'rating' in data:
                    books[i]['rating'] = data['rating']
                if 'status' in data:
                    books[i]['status'] = data['status']
                if 'progress' in data:
                    books[i]['progress'] = data['progress']
                if 'notes' in data:
                    books[i]['notes'] = data['notes']
                if 'categories' in data:
                    books[i]['categories'] = data['categories']
                
                books[i]['updated_at'] = datetime.utcnow().isoformat()
                save_books(books)
                
                return jsonify({
                    "message": "✅ Book updated successfully!",
                    "book": books[i]
                }), 200
        
        return jsonify({"error": "Book not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """Remove a book from favorites"""
    try:
        books = load_books()
        new_books = [book for book in books if book.get('id') != book_id]
        
        if len(new_books) < len(books):
            save_books(new_books)
            return jsonify({"message": "✅ Book removed successfully!"}), 200
        return jsonify({"error": "Book not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/search', methods=['GET'])
def search_books():
    """Search Open Library API"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({"error": "Search query required"}), 400
        
        # Call Open Library API
        url = f"https://openlibrary.org/search.json?q={query}&limit=24"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        # Format books
        formatted_books = []
        for book in data.get('docs', [])[:20]:
            cover_id = book.get('cover_i')
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None
            
            formatted_book = {
                "key": book.get('key', '').replace('/works/', ''),
                "title": book.get('title', 'Untitled'),
                "author_name": book.get('author_name', ['Unknown Author']),
                "first_publish_year": book.get('first_publish_year'),
                "cover_id": cover_id,
                "cover_url": cover_url,
                "isbn": book.get('isbn', [None])[0] if book.get('isbn') else None,
                "publisher": book.get('publisher', [None])[0] if book.get('publisher') else None,
                "language": book.get('language', ['en'])[0] if book.get('language') else 'en',
                "pages": book.get('number_of_pages_median')
            }
            formatted_books.append(formatted_book)
        
        return jsonify(formatted_books), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/export', methods=['GET'])
def export_books():
    """Export all books as JSON"""
    try:
        books = load_books()
        return jsonify({
            "export_date": datetime.utcnow().isoformat(),
            "total_books": len(books),
            "books": books
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/import', methods=['POST'])
def import_books():
    """Import books from JSON"""
    try:
        data = request.json
        books = load_books()
        imported = data.get('books', [])
        
        for book in imported:
            # Generate new ID
            book['id'] = len(books) + 1
            book['imported_at'] = datetime.utcnow().isoformat()
            books.append(book)
        
        save_books(books)
        return jsonify({
            "message": f"✅ Imported {len(imported)} books successfully!",
            "total_books": len(books)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/books/stats', methods=['GET'])
def get_stats():
    """Get reading statistics"""
    try:
        books = load_books()
        
        total_books = len(books)
        read_books = len([b for b in books if b.get('status') == 'completed'])
        reading_now = len([b for b in books if b.get('status') == 'reading'])
        want_to_read = len([b for b in books if b.get('status') == 'want-to-read'])
        
        avg_rating = 0
        if books:
            ratings = [b.get('rating', 0) for b in books if b.get('rating', 0) > 0]
            avg_rating = sum(ratings) / len(ratings) if ratings else 0
        
        total_pages = sum([b.get('pages', 0) for b in books if b.get('pages')])
        avg_progress = sum([b.get('progress', 0) for b in books]) / total_books if total_books > 0 else 0
        
        return jsonify({
            "total_books": total_books,
            "completed": read_books,
            "reading": reading_now,
            "want_to_read": want_to_read,
            "average_rating": round(avg_rating, 1),
            "total_pages": total_pages,
            "average_progress": round(avg_progress, 1),
            "completion_rate": round((read_books / total_books * 100) if total_books > 0 else 0, 1)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("""
    ╔══════════════════════════════════════════╗
    ║     📚 PERSONAL BOOK TRACKER API v2.0    ║
    ║         Ready on http://localhost:5000    ║
    ╚══════════════════════════════════════════╝
    """)
    print("✅ Features loaded:")
    print("   • Open Library Search")
    print("   • Custom Books")
    print("   • Ratings & Reviews")
    print("   • Reading Status")
    print("   • Progress Tracking")
    print("   • Export/Import")
    print("   • Reading Statistics")
    print("\n🚀 Server starting...")
    app.run(debug=True, port=5000)