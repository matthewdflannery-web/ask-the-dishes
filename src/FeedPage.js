import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function FeedPage({ currentUser }) {
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { navigate('/'); return; }
    loadFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function loadFeed() {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const following = userDoc.data()?.following || [];

      if (following.length === 0) {
        setFeed([]);
        setLoading(false);
        return;
      }

      const ratingsSnap = await getDocs(collection(db, 'ratings'));
      const allRatings = ratingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const followingRatings = allRatings
        .filter(r => following.includes(r.userId))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      const userSnap = await getDocs(collection(db, 'users'));
      const usersMap = {};
      userSnap.docs.forEach(d => { usersMap[d.id] = d.data(); });

      const feedItems = followingRatings.map(r => ({
        ...r,
        userName: usersMap[r.userId]?.displayName || usersMap[r.userId]?.email?.split('@')[0] || 'Disney Fan',
      }));

      setFeed(feedItems);
    } catch (err) {
      console.error('Error loading feed:', err);
    }
    setLoading(false);
  }

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0d1117 100%)',
      color: '#e8e8e8',
      fontFamily: "'Crimson Pro', Georgia, serif",
      padding: '20px',
    },
    backBtn: {
      background: 'none',
      border: '1px solid #c9a84c',
      color: '#c9a84c',
      padding: '8px 16px',
      borderRadius: '20px',
      cursor: 'pointer',
      fontSize: '0.75rem',
      marginBottom: '24px',
    },
    title: {
      textAlign: 'center',
      fontFamily: "'Cinzel', serif",
      fontSize: '1.6rem',
      color: '#c9a84c',
      marginBottom: '24px',
    },
    card: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      maxWidth: '500px',
      margin: '0 auto 12px',
      boxSizing: 'border-box',
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '10px',
    },
    avatar: {
      width: '36px',
      height: '36px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #c9a84c, #8b6914)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1rem',
      fontWeight: 'bold',
      color: '#0a0a1a',
      flexShrink: 0,
    },
    userName: {
      fontFamily: "'Cinzel', serif",
      color: '#c9a84c',
      fontSize: '0.9rem',
    },
    date: {
      fontSize: '0.75rem',
      color: '#888',
      marginLeft: 'auto',
    },
    dishName: {
      fontSize: '1.1rem',
      fontWeight: 600,
      color: '#e8e8e8',
      marginBottom: '4px',
    },
    stars: {
      color: '#c9a84c',
      fontSize: '1rem',
      marginBottom: '6px',
    },
    review: {
      fontSize: '0.95rem',
      color: '#ccc',
      fontStyle: 'italic',
    },
    photo: {
      width: '100%',
      borderRadius: '8px',
      marginTop: '10px',
      maxHeight: '200px',
      objectFit: 'cover',
    },
    emptyState: {
      textAlign: 'center',
      color: '#888',
      padding: '60px 20px',
      fontSize: '1rem',
    },
  };

  function renderStars(rating) {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '1.2rem' }}>
          ✨ Loading feed...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate('/')}>← Back to Browse</button>
      <div style={styles.title}>🍽️ Following Feed</div>
      {feed.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🍴</div>
          <p>No activity yet from people you follow.</p>
          <button
            onClick={() => navigate('/find-users')}
            style={{ marginTop: '12px', background: '#c9a84c', color: '#0a0a1a', border: 'none', borderRadius: '20px', padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}
          >
            Find Users to Follow
          </button>
        </div>
      ) : (
        feed.map(item => (
          <div key={item.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.avatar}>
                {item.userName[0].toUpperCase()}
              </div>
              <div style={styles.userName}>{item.userName}</div>
              <div style={styles.date}>
                {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ''}
              </div>
            </div>
            <div style={styles.dishName}>{item.itemName || item.itemId}</div>
            <div style={styles.stars}>{renderStars(item.rating || 0)}</div>
            {item.review && <div style={styles.review}>"{item.review}"</div>}
            {item.photo && <img src={item.photo} alt={item.itemName} style={styles.photo} />}
          </div>
        ))
      )}
    </div>
  );
}
