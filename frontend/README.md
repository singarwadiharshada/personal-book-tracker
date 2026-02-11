#setup instructions
1.Clone and Install-
git clone https://github.com/singarwadiharshada/book-tracker.git
cd book-tracker

2.Backend (Flask + JSON)-
cd backend
python -m venv venv
venv\Scripts\activate     
pip install -r requirements.txt
python app.py

3.Frontend (React)-
cd frontend
npm install
npm start

#Architecture
How it works:
1.Frontend (React) - What you see and click
Search box → sends request to Flask
Shows books from Open Library
Save/Delete buttons → sends to Flask

2.Backend (Flask) - The brain
Gets search from React → calls Open Library API → sends back books
Saves books to books.json file
Gets/deletes books from JSON file

3.Database (JSON file) - Storage
backend-books.json stores all your saved books
No installation needed, works immediately

4.External API - Book data source
Open Library API gives us book details (title, author, cover, year)

#challenges
1.CORS issue- Browser said "No permission" to call Open Library directly.
-->Made Flask act as a middleman.React calls our backend, backend calls Open Library, then sends data back to React. No more CORS errors.
