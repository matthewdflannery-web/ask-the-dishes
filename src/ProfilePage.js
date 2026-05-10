import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function ProfilePage({ currentUser }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [wantToTry, setWantToTry] = useState([]);
  const [activeTab, setActiveTab] = useState('reviews');
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (!currentUser) {
      navigate('/');
      return;
    }
    loadProfileData();
    setProfileName(currentUser.displayName || currentUser.email?.split('@')[0] || 'Disney Fan');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function loadProfileData() {
    setLoading(true);
    try {
      const reviewsRef = collection(db, 'ratings');
      const reviewsSnap = await getDocs(query(reviewsRef, orderBy('timestamp', 'desc')));
      const reviewsList = reviewsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.userId === currentUser.uid);
      setReviews(reviewsList);

      const wttRef = collection(db, 'users', currentUser.uid, 'wantToTry');
      const wttSnap = await getDocs(wttRef);
      const wttList = wttSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setWantToTry(wttList);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
    setLoading(false);
  }



  async function saveName() {
    if (!nameInput.trim()) return;
    try {
      await updateProfile(currentUser, { displayName: nameInput.trim() });
      await updateDoc(doc(db, 'users', currentUser.uid), { displayName: nameInput.trim() });
      setProfileName(nameInput.trim());
      setEditingName(false);
    } catch (err) {
      console.error('Error saving name:', err);
    }
  }

  function renderStars(rating) {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
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
      fontFamily: "'Cinzel', serif",
      fontSize: '0.75rem',
      marginBottom: '24px',
    },
    avatarCircle: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #c9a84c, #8b6914)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
      fontFamily: "'Cinzel', serif",
      color: '#0a0a1a',
      fontWeight: 'bold',
      margin: '0 auto 12px',
      border: '3px solid #c9a84c',
    },
    displayName: {
      textAlign: 'center',
      fontFamily: "'Cinzel', serif",
      fontSize: '1.4rem',
      color: '#c9a84c',
      marginBottom: '4px',
    },
    joinDate: {
      textAlign: 'center',
      fontSize: '0.85rem',
      color: '#888',
      marginBottom: '24px',
    },
    statsRow: {
      display: 'flex',
      justifyContent: 'center',
      gap: '32px',
      marginBottom: '32px',
    },
    statBox: {
      textAlign: 'center',
    },
    statNumber: {
      fontSize: '1.8rem',
      fontFamily: "'Cinzel', serif",
      color: '#c9a84c',
      display: 'block',
    },
    statLabel: {
      fontSize: '0.75rem',
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
    tabs: {
      display: 'flex',
      justifyContent: 'center',
      gap: '8px',
      marginBottom: '24px',
    },
    tab: {
      padding: '8px 20px',
      borderRadius: '20px',
      border: '1px solid #333',
      background: 'none',
      color: '#888',
      cursor: 'pointer',
      fontFamily: "'Cinzel', serif",
      fontSize: '0.75rem',
    },
    activeTab: {
      padding: '8px 20px',
      borderRadius: '20px',
      border: '1px solid #c9a84c',
      background: 'rgba(201,168,76,0.15)',
      color: '#c9a84c',
      cursor: 'pointer',
      fontFamily: "'Cinzel', serif",
      fontSize: '0.75rem',
    },
    card: {
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      maxWidth: '600px',
      margin: '0 auto 12px',
      boxSizing: 'border-box',
      width: '100%',
    },
    cardTitle: {
      fontFamily: "'Cinzel', serif",
      color: '#c9a84c',
      fontSize: '1rem',
      marginBottom: '4px',
    },
    cardPark: {
      fontSize: '0.8rem',
      color: '#888',
      marginBottom: '8px',
    },
    cardStars: {
      color: '#c9a84c',
      fontSize: '1rem',
      marginBottom: '6px',
    },
    cardReview: {
      fontSize: '0.95rem',
      color: '#ccc',
      fontStyle: 'italic',
    },
    emptyState: {
      textAlign: 'center',
      color: '#888',
      padding: '40px 20px',
      fontSize: '1rem',
    },
  };

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#c9a84c', fontFamily: "'Cinzel', serif", fontSize: '1.2rem' }}>
          ✨ Loading your profile...
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : '—';

  const joinDate = currentUser?.metadata?.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Disney Fan';

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={() => navigate('/')}>← Back to Browse</button>

      <div style={styles.avatarCircle}>{profileName ? profileName[0].toUpperCase() : currentUser?.email?.[0]?.toUpperCase() || '?'}</div>
      {editingName ? (
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            style={{ fontFamily: "'Cinzel', serif", fontSize: '1rem', padding: '6px 12px', borderRadius: 8, border: '1px solid #c9a84c', background: 'rgba(255,255,255,0.08)', color: '#c9a84c', textAlign: 'center', marginRight: 8 }}
            autoFocus
          />
          <button onClick={saveName} style={{ background: '#c9a84c', color: '#0a0a1a', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Save</button>
          <button onClick={() => setEditingName(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.8rem', marginLeft: 6 }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: "'Cinzel', serif", fontSize: '1.4rem', color: '#c9a84c', marginBottom: '4px' }}>
          {profileName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Disney Fan'}
          <button onClick={() => { setNameInput(profileName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Disney Fan'); setEditingName(true); }} style={{ background: 'none', border: 'none', color: '#c9a84c', cursor: 'pointer', fontSize: '1rem', padding: 0 }}>edit</button>
        </div>
      )}
      <div style={styles.joinDate}>Member since {joinDate}</div>

      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <span style={styles.statNumber}>{reviews.length}</span>
          <span style={styles.statLabel}>Reviews</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statNumber}>{avgRating}</span>
          <span style={styles.statLabel}>Avg Rating</span>
        </div>
        <div style={styles.statBox}>
          <span style={styles.statNumber}>{wantToTry.length}</span>
          <span style={styles.statLabel}>Want To Try</span>
        </div>
      </div>

      <div style={styles.tabs}>
        <button
          style={activeTab === 'reviews' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
        <button
          style={activeTab === 'wantToTry' ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab('wantToTry')}
        >
          Want To Try
        </button>
      </div>

      {activeTab === 'reviews' && (
        <div>
          {reviews.length === 0 ? (
            <div style={styles.emptyState}>
              🍽️ No reviews yet — go taste something magical!
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.id} style={styles.card}>
                <div style={styles.cardTitle}>
                  {review.itemName || review.itemId || 'Unknown Dish'}
                </div>
                <div style={styles.cardPark}>
                  {review.timestamp ? new Date(review.timestamp).toLocaleDateString() : ''}
                </div>
                <div style={styles.cardStars}>{renderStars(review.rating || 0)}</div>
                {review.review && <div style={styles.cardReview}>"{review.review}"</div>}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'wantToTry' && (
        <div>
          {wantToTry.length === 0 ? (
            <div style={styles.emptyState}>
              🌟 Nothing saved yet — bookmark items you want to try!
            </div>
          ) : (
            wantToTry.map(item => (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardTitle}>{item.name || item.id}</div>
                <div style={styles.cardPark}>{item.park || ''}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}