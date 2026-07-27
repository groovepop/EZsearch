import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange, loading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2.5rem' }}>
      <button
        className="btn btn-secondary"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1 || loading}
        style={{ opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
      >
        <ChevronLeft size={18} />
        <span>Previous</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>Page {currentPage}</span>
        {totalPages && <span style={{ color: 'var(--text-muted)' }}>/ {totalPages}</span>}
      </div>

      <button
        className="btn btn-secondary"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={loading}
      >
        <span>Next</span>
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
