import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  // ============ STATE MANAGEMENT ============
  const [savedBooks, setSavedBooks] = useState([]);
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom book form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    year: '',
    cover_url: ''
  });

  // Filter and sort
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Statistics
  const [stats, setStats] = useState({
    total_books: 0,
    completed: 0,
    reading: 0,
    want_to_read: 0,
    average_rating: 0,
    completion_rate: 0
  });

  // Toast notification
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);

  // ============ INITIALIZATION ============
  useEffect(() => {
    const fetchSavedBooks = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/books');
        setSavedBooks(response.data);
      } catch (err) {
        showToast('❌ Failed to load books', 'error');
        console.error('Error fetching books:', err);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/books/stats');
        setStats(response.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };

    fetchSavedBooks();
    fetchStats();
  }, []);

  // ============ SEARCH BOOKS ============
  const searchBooks = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`http://localhost:5000/api/books/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
      if (response.data.length === 0) {
        setError('No books found. Try a different search or add a custom book!');
      }
    } catch (err) {
      setError('Failed to search books. Is backend running?');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Clear search query
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  };

  // ============ SAVE BOOK ============
  const saveBook = async (book) => {
    try {
      const response = await axios.post('http://localhost:5000/api/books', {
        ...book,
        rating: 0,
        status: 'want-to-read',
        progress: 0,
        notes: '',
        categories: []
      });
      
      if (response.status === 201 || response.status === 200) {
        showToast('✅ Book saved to favorites!', 'success');
        const savedBook = { 
          ...book, 
          _id: response.data.id || book.key,
          id: response.data.id || book.key,
          saved_at: new Date().toISOString(),
          rating: 0,
          status: 'want-to-read',
          progress: 0
        };
        setSavedBooks([savedBook, ...savedBooks]);
        
        // Update stats after saving
        const fetchStats = async () => {
          try {
            const response = await axios.get('http://localhost:5000/api/books/stats');
            setStats(response.data);
          } catch (err) {
            console.error('Error fetching stats:', err);
          }
        };
        fetchStats();
      }
    } catch (err) {
      showToast('❌ Failed to save book', 'error');
      console.error('Save error:', err);
    }
  };

  // ============ UPDATE BOOK ============
  const updateBook = async (bookId, updates) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/books/${bookId}`, updates);
      
      if (response.status === 200) {
        setSavedBooks(savedBooks.map(book => 
          book.id === bookId || book._id === bookId 
            ? { ...book, ...updates, updated_at: new Date().toISOString() }
            : book
        ));
        
        // Update stats after updating
        const fetchStats = async () => {
          try {
            const response = await axios.get('http://localhost:5000/api/books/stats');
            setStats(response.data);
          } catch (err) {
            console.error('Error fetching stats:', err);
          }
        };
        fetchStats();
        return true;
      }
    } catch (err) {
      console.error('Update error:', err);
      showToast('❌ Failed to update book', 'error');
      return false;
    }
  };

  // ============ UPDATE RATING ============
  const updateRating = async (bookId, rating) => {
    await updateBook(bookId, { rating });
    showToast(`⭐ Rated ${rating} stars!`, 'success');
  };

  // ============ UPDATE STATUS ============
  const updateStatus = async (bookId, status) => {
    await updateBook(bookId, { status });
    const statusMessages = {
      'want-to-read': '📌 Added to want to read',
      'reading': '📖 Started reading',
      'completed': '✅ Completed! Great job!'
    };
    showToast(statusMessages[status] || 'Status updated', 'success');
  };

  // ============ UPDATE PROGRESS ============
  const updateProgress = async (bookId, progress) => {
    await updateBook(bookId, { progress: parseInt(progress) });
  };

  // ============ DELETE BOOK ============
  const confirmDelete = (bookId) => {
    setBookToDelete(bookId);
    setShowDeleteConfirm(true);
  };

  const deleteBook = async () => {
    if (!bookToDelete) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/books/${bookToDelete}`);
      setSavedBooks(savedBooks.filter(book => book.id !== bookToDelete && book._id !== bookToDelete));
      showToast('✅ Book removed from library', 'success');
      
      // Update stats after deleting
      const fetchStats = async () => {
        try {
          const response = await axios.get('http://localhost:5000/api/books/stats');
          setStats(response.data);
        } catch (err) {
          console.error('Error fetching stats:', err);
        }
      };
      fetchStats();
    } catch (err) {
      showToast('❌ Failed to delete book', 'error');
      console.error('Delete error:', err);
    } finally {
      setShowDeleteConfirm(false);
      setBookToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setBookToDelete(null);
  };

  // ============ ADD CUSTOM BOOK ============
  const addCustomBook = async (e) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author) {
      showToast('❌ Title and author are required', 'error');
      return;
    }

    const customBook = {
      key: `custom-${Date.now()}`,
      title: newBook.title,
      author_name: [newBook.author],
      first_publish_year: parseInt(newBook.year) || new Date().getFullYear(),
      cover_url: newBook.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=150',
      is_custom: true
    };

    await saveBook(customBook);
    setShowAddForm(false);
    setNewBook({ title: '', author: '', year: '', cover_url: '' });
  };

  // ============ TOAST NOTIFICATION ============
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // ============ CHECK IF BOOK SAVED ============
  const isBookSaved = (bookKey) => {
    return savedBooks.some(book => book.key === bookKey);
  };

  // ============ FILTER AND SORT BOOKS ============
  const getFilteredAndSortedBooks = () => {
    let filtered = [...savedBooks];
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(book => book.status === filterStatus);
    }
    
    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(book => 
        book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author_name?.join(' ').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));
        break;
      case 'title':
        filtered.sort((a, b) => a.title?.localeCompare(b.title));
        break;
      case 'author':
        filtered.sort((a, b) => 
          (a.author_name?.[0] || '').localeCompare(b.author_name?.[0] || '')
        );
        break;
      case 'year':
        filtered.sort((a, b) => (b.first_publish_year || 0) - (a.first_publish_year || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'progress':
        filtered.sort((a, b) => (b.progress || 0) - (a.progress || 0));
        break;
      default:
        break;
    }
    
    return filtered;
  };

  // ============ RENDER ============
  return (
    <div className="App">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <span className="modal-icon">🗑️</span>
              <h3>Remove Book</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to remove this book from your library?</p>
              <p className="modal-warning">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button onClick={cancelDelete} className="modal-cancel-btn">
                Cancel
              </button>
              <button onClick={deleteBook} className="modal-confirm-btn">
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header>
        <h1>📚 Personal Book Tracker</h1>
        <p className="tagline">Discover, Track, and Manage Your Reading Journey</p>
        
        {/* Statistics Cards */}
        <div className="stats-cards">
          <div className="stat-card">
            <span className="stat-value">{stats.total_books}</span>
            <span className="stat-label">Total Books</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.reading}</span>
            <span className="stat-label">Reading Now</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.average_rating || 0}⭐</span>
            <span className="stat-label">Avg Rating</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.completion_rate || 0}%</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'search' ? 'active' : ''}
          onClick={() => setActiveTab('search')}
        >
          🔍 Search Books
        </button>
        <button 
          className={activeTab === 'favorites' ? 'active' : ''}
          onClick={() => setActiveTab('favorites')}
        >
          📖 My Library ({savedBooks.length})
        </button>
      </div>

      {/* Main Content */}
      <main>
        {activeTab === 'search' ? (
          /* ============ SEARCH TAB ============ */
          <div className="search-section">
            {/* Search Form and Add Button in one line */}
            <div className="search-container">
              <form onSubmit={searchBooks} className="search-form">
                <div className="search-wrapper">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, author, or ISBN..."
                    className="search-input"
                  />
                  {searchQuery && (
                    <button 
                      type="button" 
                      className="clear-search-btn"
                      onClick={clearSearch}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button type="submit" className="search-btn" disabled={loading}>
                  {loading ? '🔍...' : '🔍'}
                </button>
              </form>
              
              <button 
                onClick={() => setShowAddForm(!showAddForm)} 
                className="add-custom-btn"
              >
                {showAddForm ? '✖ Close' : '➕ Add Custom'}
              </button>
            </div>

            {/* Custom Book Form */}
            {showAddForm && (
              <div className="custom-book-form-container">
                <form onSubmit={addCustomBook} className="custom-book-form">
                  <h3>➕ Add Your Own Book</h3>
                  <p className="form-hint">Don't see your book? Add it manually!</p>
                  
                  <div className="form-group">
                    <label>Book Title *</label>
                    <input
                      type="text"
                      placeholder="e.g., The Great Gatsby"
                      value={newBook.title}
                      onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Author Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., F. Scott Fitzgerald"
                      value={newBook.author}
                      onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Publication Year</label>
                      <input
                        type="number"
                        placeholder="2024"
                        value={newBook.year}
                        onChange={(e) => setNewBook({...newBook, year: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Cover Image URL</label>
                      <input
                        type="url"
                        placeholder="https://... (optional)"
                        value={newBook.cover_url}
                        onChange={(e) => setNewBook({...newBook, cover_url: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="form-buttons">
                    <button type="submit" className="save-btn">✅ Add to Library</button>
                    <button type="button" onClick={() => setShowAddForm(false)} className="cancel-btn">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Error Message */}
            {error && <div className="error">{error}</div>}

            {/* Search Results */}
            <div className="results-grid">
              {searchResults.map((book) => {
                const saved = isBookSaved(book.key);
                return (
                  <div key={book.key} className="book-card">
                    <div className="book-cover">
                      <img 
                        src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=150'} 
                        alt={book.title}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=150';
                        }}
                      />
                    </div>
                    <div className="book-info">
                      <h3 className="book-title">{book.title}</h3>
                      <p className="book-author">
                        <strong>✍️ Author:</strong> {Array.isArray(book.author_name) 
                          ? book.author_name.join(', ') 
                          : book.author_name || 'Unknown'}
                      </p>
                      {book.first_publish_year && (
                        <p className="book-year">
                          <strong>📅 Published:</strong> {book.first_publish_year}
                        </p>
                      )}
                      {book.publisher && (
                        <p className="book-publisher">
                          <strong>🏢 Publisher:</strong> {book.publisher}
                        </p>
                      )}
                      <button 
                        className={saved ? 'saved-btn' : 'save-btn'}
                        onClick={() => !saved && saveBook(book)}
                        disabled={saved}
                      >
                        {saved ? '✓ In Library' : '➕ Save'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Welcome Message */}
            {searchResults.length === 0 && !loading && !error && (
              <div className="welcome">
                <div className="welcome-icon">📚</div>
                <h2>Welcome to Your Personal Library!</h2>
                <p>Search for millions of books from Open Library or add your own custom books</p>
              </div>
            )}
          </div>
        ) : (
          /* ============ LIBRARY TAB ============ */
          <div className="favorites-section">
            {/* Library Header */}
            <div className="library-header">
              <h2>📖 My Reading Library</h2>
            </div>

            {/* Filters and Search */}
            {savedBooks.length > 0 && (
              <div className="library-filters">
                <div className="filter-group">
                  <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">📚 All Books</option>
                    <option value="want-to-read">📌 Want to Read</option>
                    <option value="reading">📖 Currently Reading</option>
                    <option value="completed">✅ Completed</option>
                  </select>
                  
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="recent">🕐 Recently Added</option>
                    <option value="title">🔤 Title A-Z</option>
                    <option value="author">✍️ Author A-Z</option>
                    <option value="year">📅 Year (Newest)</option>
                    <option value="rating">⭐ Highest Rated</option>
                    <option value="progress">📊 Reading Progress</option>
                  </select>
                </div>
                
                <div className="search-library">
                  <input
                    type="text"
                    placeholder="🔍 Search in your library..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="library-search-input"
                  />
                </div>
              </div>
            )}

            {/* Empty State */}
            {savedBooks.length === 0 ? (
              <div className="empty-library">
                <div className="empty-icon">📚</div>
                <h3>Your library is empty</h3>
                <p>Start building your collection by searching for books or adding custom ones!</p>
                <div className="empty-actions">
                  <button onClick={() => setActiveTab('search')} className="primary-btn">
                    🔍 Search Books
                  </button>
                  <button onClick={() => setShowAddForm(true)} className="secondary-btn">
                    ➕ Add Custom Book
                  </button>
                </div>
              </div>
            ) : (
              /* Books Grid */
              <div className="favorites-grid">
                {getFilteredAndSortedBooks().map((book) => (
                  <div key={book.id || book._id} className="favorite-card">
                    <div className="favorite-cover">
                      <img 
                        src={book.cover_url || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=150'} 
                        alt={book.title}
                      />
                      {book.is_custom && (
                        <span className="custom-badge">✨ Custom</span>
                      )}
                    </div>
                    
                    <div className="favorite-info">
                      <h3 className="favorite-title">{book.title}</h3>
                      
                      <div className="favorite-details">
                        <p className="favorite-author">
                          <strong>✍️ Author:</strong> {Array.isArray(book.author_name) 
                            ? book.author_name.join(', ') 
                            : book.author_name || 'Unknown'}
                        </p>
                        
                        {book.first_publish_year && (
                          <p className="favorite-year">
                            <strong>📅 Published:</strong> {book.first_publish_year}
                          </p>
                        )}
                        
                        {/* Reading Status Dropdown */}
                        <div className="status-selector">
                          <label>📖 Status:</label>
                          <select 
                            value={book.status || 'want-to-read'}
                            onChange={(e) => updateStatus(book.id || book._id, e.target.value)}
                            className="status-dropdown"
                          >
                            <option value="want-to-read">📌 Want to Read</option>
                            <option value="reading">📖 Currently Reading</option>
                            <option value="completed">✅ Completed</option>
                          </select>
                        </div>

                        {/* Rating Stars */}
                        <div className="rating-container">
                          <label>⭐ Rating:</label>
                          <div className="stars">
                            {[1,2,3,4,5].map((star) => (
                              <span 
                                key={star}
                                className={`star ${book.rating >= star ? 'filled' : ''}`}
                                onClick={() => updateRating(book.id || book._id, star)}
                              >
                                ★
                              </span>
                            ))}
                            <span className="rating-value">{book.rating || 0}/5</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {book.status === 'reading' && (
                          <div className="progress-container">
                            <label>📊 Progress:</label>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill" 
                                style={{width: `${book.progress || 0}%`}}
                              ></div>
                            </div>
                            <div className="progress-controls">
                              <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={book.progress || 0}
                                onChange={(e) => updateProgress(book.id || book._id, e.target.value)}
                                className="progress-slider"
                              />
                              <span className="progress-text">{book.progress || 0}%</span>
                            </div>
                          </div>
                        )}

                        {/* Saved Date */}
                        {book.saved_at && (
                          <p className="saved-date">
                            <strong>📌 Added:</strong> {new Date(book.saved_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="favorite-actions">
                        <button 
                          className="delete-btn"
                          onClick={() => confirmDelete(book.id || book._id)}
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;