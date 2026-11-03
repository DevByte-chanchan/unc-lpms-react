import { Search } from 'react-feather'
import styles from '../styles/PageSearch.module.sass'
import { setPageSearch, usePageSearchBox } from '../utils/pageSearch.js'

// The search box of the current list page, placed by the page itself next to its filters. The page
// registers it with usePageSearch(placeholder) and filters its own list by what comes back.
const PageSearch = () => {
  const box = usePageSearchBox()
  if (!box.active) return null
  return (
    <div className={styles.search}>
      <Search size={16} aria-hidden="true" />
      <input value={box.query} onChange={(event) => setPageSearch(event.target.value)}
        placeholder={box.placeholder} aria-label={box.placeholder} />
    </div>
  )
}

export default PageSearch
