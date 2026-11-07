import type { CSSProperties } from 'react'
import type { Book, ReadingStatus } from '../lib/types'
import { STATUS_LABEL } from '../lib/utils'

const COVER_COLORS = ['#e8dec9', '#dfe4d7', '#eadbd0', '#dce0e2', '#e6dfcd', '#e0d9e2']

function colorFor(seed: string): string {
  // djb2：让不同书名更均匀地落到几种纸色上
  let hash = 5381
  for (let i = 0; i < seed.length; i++) hash = (((hash << 5) + hash) ^ seed.charCodeAt(i)) >>> 0
  return COVER_COLORS[hash % COVER_COLORS.length]
}

type CoverBook = Pick<Book, 'id' | 'title' | 'author' | 'cover' | 'publisher'>

export function Cover({
  book,
  status,
  className = '',
}: {
  book: CoverBook
  status?: ReadingStatus
  className?: string
}) {
  const style = { '--cover-bg': colorFor(book.id + book.title) } as CSSProperties
  return (
    <div className={`book-cover ${className}`}>
      {book.cover ? (
        <img src={book.cover} alt={`${book.title} 封面`} loading="lazy" />
      ) : (
        <div className="cover-generated" style={style}>
          <div className="cover-title">{book.title}</div>
          <div className="cover-foot">{book.author || book.publisher || '麦克'}</div>
        </div>
      )}
      {status && <span className="card-status">{STATUS_LABEL[status]}</span>}
    </div>
  )
}
