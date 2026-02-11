from app import app

if __name__ == '__main__':
    print("🚀 Starting Book Tracker API on http://localhost:5000")
    print("📚 API Endpoints:")
    print("   GET  /api/books          - Get saved books")
    print("   POST /api/books          - Save a book")
    print("   GET  /api/books/search   - Search books")
    print("   GET  /api/health         - Health check")
    print("   DELETE /api/books/<id>   - Remove a book")
    app.run(debug=True, port=5000)