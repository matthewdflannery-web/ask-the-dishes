import { useState, useEffect, useMemo } from 'react';
import { LogOut } from 'lucide-react';

// Firebase imports
import { auth, db, storage } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ── Design tokens ─────────────────────────────────────────────
const PARK_COLORS = {
  'Magic Kingdom':     { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  'EPCOT':             { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  'Hollywood Studios': { bg: '#FFF7ED', text: '#9A3412', dot: '#F97316' },
  'Animal Kingdom':    { bg: '#F0FDF4', text: '#14532D', dot: '#22C55E' },
  'Disney Springs':    { bg: '#FDF4FF', text: '#6B21A8', dot: '#A855F7' },
};

const PRICE_ORDER = { '$': 1, '$$': 2, '$$$': 3 };

const CATEGORY_ICONS = {
  Snack:   '🍿',
  Meal:    '🍽️',
  Dessert: '🍰',
  Drink:   '🥤',
};
 
// ── Helpers ───────────────────────────────────────────────────
function StarRating({ rating, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <svg key={s} width={size} height={size} viewBox="0 0 20 20"
          fill={s <= Math.round(rating) ? '#FBBF24' : '#E5E7EB'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function ParkBadge({ park }) {
  const c = PARK_COLORS[park] || { bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 500,
      padding: '2px 8px', borderRadius: 99,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {park}
    </span>
  );
}

// ── ItemCard ──────────────────────────────────────────────────
function ItemCard({ item, userRatings, userLikes, onSelect }) {
  const myRating = userRatings?.[item.id];
  const liked    = userLikes?.includes?.(item.id);

  return (
    <button
      onClick={() => onSelect(item)}
      style={{
        background: 'var(--color-background-primary)',
        border: '0.5px solid var(--color-border-tertiary)',
        borderRadius: 'var(--border-radius-lg)',
        padding: 0, overflow: 'hidden',
        textAlign: 'left', cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
        display: 'flex', flexDirection: 'column', width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-secondary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-tertiary)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{
        height: 140, background: 'var(--color-background-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 64, position: 'relative', overflow: 'hidden',
      }}>
        {item.photoUrl
          ? <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span>{item.image || CATEGORY_ICONS[item.category] || '🍴'}</span>
        }
        <span style={{
          position: 'absolute', top: 10, right: 10,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
        }}>{item.price}</span>
        {liked && (
          <span style={{ position: 'absolute', top: 10, left: 10, color: '#F43F5E', fontSize: 16 }}>♥</span>
        )}
      </div>

      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <p style={{ fontWeight: 500, fontSize: 15, margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
            {item.name}
          </p>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', flexShrink: 0, paddingTop: 2 }}>
            {CATEGORY_ICONS[item.category]} {item.category}
          </span>
        </div>

        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
          📍 {item.location}
        </p>

        <ParkBadge park={item.park} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <StarRating rating={item.avgRating || 0} />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {(item.avgRating || 0).toFixed(1)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            ({(item.totalRatings || 0).toLocaleString()})
          </span>
          {myRating && (
            <span style={{
              marginLeft: 'auto', fontSize: 11,
              background: 'var(--color-background-info)',
              color: 'var(--color-text-info)',
              padding: '1px 7px', borderRadius: 99, fontWeight: 500,
            }}>
              Your rating: {myRating.rating}
            </span>
          )}
        </div>

        {item.dietary?.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {item.dietary.map(d => (
              <span key={d} style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 99,
                background: 'var(--color-background-success)',
                color: 'var(--color-text-success)',
              }}>{d}</span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ── ItemDetailModal ───────────────────────────────────────────
function ItemDetailModal({ item, currentUser, userRatings, onRate, onClose }) {
  const [rating, setRating]     = useState(userRatings?.[item.id]?.rating || 0);
  const [hover, setHover]       = useState(0);
  const [review, setReview]     = useState(userRatings?.[item.id]?.review || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    await onRate(item.id, rating, review, null);
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div style={{
        background: 'var(--color-background-primary)',
        borderRadius: 16,
        border: '0.5px solid var(--color-border-tertiary)',
        width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{
          height: 200, background: 'var(--color-background-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 80, position: 'relative', overflow: 'hidden',
          borderRadius: '16px 16px 0 0',
        }}>
          {item.photoUrl
            ? <img src={item.photoUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : item.image || CATEGORY_ICONS[item.category] || '🍴'
          }
          <button onClick={onClose} style={{
            position: 'absolute', top: 12, right: 12,
            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>×</button>
        </div>

        <div style={{ padding: '20px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--color-text-primary)' }}>{item.name}</h2>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-secondary)' }}>{item.price}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '0 0 8px' }}>📍 {item.location}</p>
          <ParkBadge park={item.park} />
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '12px 0', lineHeight: 1.6 }}>{item.description}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0' }}>
            <StarRating rating={item.avgRating || 0} size={16} />
            <span style={{ fontWeight: 500 }}>{(item.avgRating || 0).toFixed(1)}</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              from {(item.totalRatings || 0).toLocaleString()} ratings
            </span>
          </div>

          {item.dietary?.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 16 }}>
              {item.dietary.map(d => (
                <span key={d} style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 99,
                  background: 'var(--color-background-success)',
                  color: 'var(--color-text-success)',
                }}>{d}</span>
              ))}
            </div>
          )}

          {currentUser && (
            <div style={{ borderTop: '0.5px solid var(--color-border-tertiary)', paddingTop: 16, marginTop: 4 }}>
              <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 8px', color: 'var(--color-text-primary)' }}>
                {submitted ? '✓ Rating saved!' : 'Rate this dish'}
              </p>
              {!submitted && (
                <>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                    {[1,2,3,4,5].map(s => (
                      <button key={s}
                        onMouseEnter={() => setHover(s)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(s)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                          fontSize: 28,
                          filter: s <= (hover || rating) ? 'none' : 'grayscale(1) opacity(0.3)',
                          transition: 'filter 0.1s',
                        }}
                      >⭐</button>
                    ))}
                  </div>
                  <textarea
                    value={review}
                    onChange={e => setReview(e.target.value)}
                    placeholder="Add a review (optional)…"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: 13 }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!rating || submitting}
                    style={{
                      marginTop: 8, width: '100%',
                      background: rating ? '#EFF6FF' : 'var(--color-background-secondary)',
                      color: rating ? '#1D4ED8' : 'var(--color-text-secondary)',
                      border: '0.5px solid var(--color-border-secondary)',
                      borderRadius: 8, padding: '8px 0',
                      fontWeight: 500, cursor: rating ? 'pointer' : 'default',
                    }}
                  >
                    {submitting ? 'Saving…' : `Submit rating${rating ? ` (${rating}/5)` : ''}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MainContent ───────────────────────────────────────────────
function MainContent({ items, currentUser, onRate, userRatings, userLikes, wantToTry, parks, categories, priceRanges }) {
  const [searchTerm, setSearchTerm]             = useState('');
  const [selectedPark, setSelectedPark]         = useState('All Parks');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPrice, setSelectedPrice]       = useState('All');
  const [sortBy, setSortBy]                     = useState('highest');
  const [selectedItem, setSelectedItem]         = useState(null);

  const filtered = useMemo(() => {
    let result = [...items];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.name?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q)
      );
    }
    if (selectedPark !== 'All Parks') result = result.filter(i => i.park === selectedPark);
    if (selectedCategory !== 'All')   result = result.filter(i => i.category === selectedCategory);
    if (selectedPrice !== 'All')      result = result.filter(i => i.price === selectedPrice);
    result.sort((a, b) => {
      if (sortBy === 'highest')       return (b.avgRating || 0) - (a.avgRating || 0);
      if (sortBy === 'most_reviewed') return (b.totalRatings || 0) - (a.totalRatings || 0);
      if (sortBy === 'name_az')       return a.name.localeCompare(b.name);
      if (sortBy === 'price_low')     return (PRICE_ORDER[a.price] || 99) - (PRICE_ORDER[b.price] || 99);
      return 0;
    });
    return result;
  }, [items, searchTerm, selectedPark, selectedCategory, selectedPrice, sortBy]);

  const hasActiveFilters = searchTerm || selectedPark !== 'All Parks' || selectedCategory !== 'All' || selectedPrice !== 'All';

  const selectStyle = {
    fontSize: 13, padding: '6px 10px',
    border: '0.5px solid #D1D5DB',
    borderRadius: 8,
    background: 'white',
    cursor: 'pointer',
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#9CA3AF', pointerEvents: 'none', fontSize: 16,
        }}>🔍</span>
        <input
          type="text"
          placeholder="Search dishes, locations, parks…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            width: '100%', paddingLeft: 38, paddingRight: searchTerm ? 38 : 12,
            boxSizing: 'border-box', fontSize: 14, padding: '10px 12px 10px 38px',
            border: '0.5px solid #D1D5DB', borderRadius: 10, outline: 'none',
          }}
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18,
          }}>×</button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 20 }}>
        <select value={selectedPark} onChange={e => setSelectedPark(e.target.value)} style={selectStyle}>
          {(parks || ['All Parks','Magic Kingdom','EPCOT','Hollywood Studios','Animal Kingdom','Disney Springs']).map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={selectStyle}>
          {(categories || ['All','Snack','Meal','Dessert','Drink']).map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={selectedPrice} onChange={e => setSelectedPrice(e.target.value)} style={selectStyle}>
          {(priceRanges || ['All','$','$$','$$$']).map(p => <option key={p}>{p === 'All' ? 'Any price' : p}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
          <option value="highest">Highest rated</option>
          <option value="most_reviewed">Most reviewed</option>
          <option value="name_az">Name A–Z</option>
          <option value="price_low">Price low–high</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6B7280' }}>
          {filtered.length} of {items.length} items
        </span>
      </div>

      {/* Active park pill */}
      {selectedPark !== 'All Parks' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#EFF6FF', color: '#1D4ED8',
            fontSize: 12, padding: '3px 10px', borderRadius: 99,
          }}>
            {selectedPark}
            <button onClick={() => setSelectedPark('All Parks')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>×</button>
          </span>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6B7280' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍴</div>
          <p style={{ fontWeight: 500, marginBottom: 6 }}>No dishes found</p>
          <p style={{ fontSize: 14 }}>
            {hasActiveFilters ? 'Try adjusting your filters or search term.' : 'No items in the database yet.'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedPark('All Parks'); setSelectedCategory('All'); setSelectedPrice('All'); }}
              style={{ marginTop: 12, fontSize: 13, padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {filtered.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            userRatings={userRatings}
            userLikes={userLikes}
            onSelect={setSelectedItem}
          />
        ))}
      </div>

      {/* Detail modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          currentUser={currentUser}
          userRatings={userRatings}
          onRate={onRate}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

// ── AuthScreen ────────────────────────────────────────────────
function AuthScreen({ onSignIn, onSignUp }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = isSignUp
      ? await onSignUp(email, password, displayName)
      : await onSignIn(email, password);
    if (!result.success) setError(result.error);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/waltograph');
        .disney-title { font-family: 'Waltograph', cursive; letter-spacing: 0.08em; }
      `}</style>
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #7C3AED, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <h1 className="disney-title" style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🏰 Ask The Dishes</h1>
          <p style={{ color: '#6B7280', textAlign: 'center', marginBottom: 24 }}>Rate and discover Disney World treats</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {isSignUp && (
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Display Name</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, boxSizing: 'border-box' }}
                  placeholder="Your Name" required={isSignUp} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, boxSizing: 'border-box' }}
                placeholder="you@example.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 8, boxSizing: 'border-box' }}
                placeholder="••••••••" required minLength={6} />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: 8, fontSize: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" style={{
              background: '#7C3AED', color: 'white', padding: '10px',
              borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 15, cursor: 'pointer',
            }}>
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', color: '#7C3AED', cursor: 'pointer', fontSize: 14 }}>
              {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Header ────────────────────────────────────────────────────
function Header({ onSignOut }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.cdnfonts.com/css/waltograph');
        .disney-title { font-family: 'Waltograph', cursive; letter-spacing: 0.08em; }
      `}</style>
      <header style={{ background: 'linear-gradient(90deg, #7C3AED, #2563EB)', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="disney-title" style={{ fontSize: 32, margin: 0 }}>🏰 Ask The Dishes</h1>
          <button onClick={onSignOut} style={{
            background: 'white', color: '#7C3AED', padding: '8px 16px',
            borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
          }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>
    </>
  );
}

// ── App ───────────────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showAuth, setShowAuth]       = useState(true);

  const [items, setItems]           = useState([]);
  const [userRatings, setUserRatings] = useState({});
  const [userLikes, setUserLikes]   = useState([]);
  const [wantToTry, setWantToTry]   = useState([]);

  const parks       = ['All Parks', 'Magic Kingdom', 'EPCOT', 'Hollywood Studios', 'Animal Kingdom', 'Disney Springs'];
  const categories  = ['All', 'Snack', 'Meal', 'Dessert', 'Drink'];
  const priceRanges = ['All', '$', '$$', '$$$'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user.uid);
        setShowAuth(false);
        loadUserData(user.uid);
      } else {
        setCurrentUser(null);
        setShowAuth(true);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]); // eslint-disable-line

  const loadItems = async () => {
    try {
      const snap = await getDocs(collection(db, 'items'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(data.length ? data : getDefaultItems());
    } catch {
      setItems(getDefaultItems());
    }
  };

  const loadUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const d = userDoc.data();
        setUserRatings(d.ratings || {});
        setUserLikes(d.likes || []);
        setWantToTry(d.wantToTry || []);
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  };

  const handleSignUp = async (email, password, displayName) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid, email, displayName: displayName || email.split('@')[0],
        createdAt: new Date().toISOString(),
        ratings: {}, likes: [], following: [], followers: [], wantToTry: [], tripPlan: [], totalCheckins: 0,
      });
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const handleSignOut = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
  };

  const handleRate = async (itemId, rating, review, photoFile) => {
    if (!currentUser) return;
    try {
      let photoUrl = null;
      if (photoFile) {
        const storageRef = ref(storage, `food-photos/${currentUser}/${itemId}-${Date.now()}`);
        await uploadBytes(storageRef, photoFile);
        photoUrl = await getDownloadURL(storageRef);
      }
      const ratingData = { rating, review, photo: photoUrl, timestamp: new Date().toISOString(), userId: currentUser };
      await setDoc(doc(db, 'ratings', `${currentUser}_${itemId}`), ratingData);
      const newRatings = { ...userRatings, [itemId]: ratingData };
      setUserRatings(newRatings);
      await updateDoc(doc(db, 'users', currentUser), {
        [`ratings.${itemId}`]: ratingData,
        totalCheckins: Object.keys(newRatings).length,
      });
    } catch (e) {
      console.error('Error rating:', e);
    }
  };

  const getDefaultItems = () => [
    {
      id: '1', name: 'Dole Whip', location: 'Aloha Isle', park: 'Magic Kingdom',
      category: 'Snack', avgRating: 4.8, totalRatings: 1247,
      description: 'The iconic pineapple soft-serve treat Disney fans crave.',
      image: '🍍',
      photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Dole_Pineapple_%287192439370%29.jpg/800px-Dole_Pineapple_%287192439370%29.jpg',
      price: '$', dietary: ['Vegan', 'Dairy-Free'],
    },
    {
      id: '2', name: 'Mickey Premium Ice Cream Bar', location: 'Various Carts', park: 'Magic Kingdom',
      category: 'Dessert', avgRating: 4.6, totalRatings: 2341,
      description: 'Vanilla ice cream dipped in chocolate on a stick — a Disney classic.',
      image: '🍫', price: '$', dietary: [],
    },
    {
      id: '3', name: 'School Bread', location: 'Kringla Bakeri Og Kafe', park: 'EPCOT',
      category: 'Snack', avgRating: 4.7, totalRatings: 893,
      description: 'Norwegian cardamom bun filled with custard and coconut.',
      image: '🍞', price: '$', dietary: [],
    },
    {
      id: '4', name: 'Croissant Donut', location: 'Les Halles Boulangerie', park: 'EPCOT',
      category: 'Dessert', avgRating: 4.5, totalRatings: 654,
      description: 'Flaky, buttery croissant-donut hybrid dusted with powdered sugar.',
      image: '🥐', price: '$', dietary: [],
    },
    {
      id: '5', name: 'Satu\'li Bowls', location: 'Satu\'li Canteen', park: 'Animal Kingdom',
      category: 'Meal', avgRating: 4.4, totalRatings: 1102,
      description: 'Build-your-own bowls with grains, proteins and flavorful sauces.',
      image: '🥗', price: '$$', dietary: ['Gluten-Free Options'],
    },
    {
      id: '6', name: 'Ronto Wrap', location: 'Ronto Roasters', park: 'Hollywood Studios',
      category: 'Meal', avgRating: 4.3, totalRatings: 781,
      description: 'Roasted pork, grilled sausage, peppercorn sauce in a warm pita.',
      image: '🌯', price: '$$', dietary: [],
    },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #7C3AED, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white', fontSize: 24 }}>Loading…</div>
      </div>
    );
  }

  if (showAuth) {
    return <AuthScreen onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <Header onSignOut={handleSignOut} />
      <MainContent
        items={items}
        currentUser={currentUser}
        onRate={handleRate}
        userRatings={userRatings}
        userLikes={userLikes}
        wantToTry={wantToTry}
        parks={parks}
        categories={categories}
        priceRanges={priceRanges}
      />
    </div>
  );
}

export default App;