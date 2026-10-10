import { getCatalogStats } from '../src/shared/catalog'

const stats = getCatalogStats()
console.log(JSON.stringify(stats, null, 2))
