import Header from '@/components/boutique/Header';
import { listCategories } from '@/modules/catalog/repository';
import { currentUser } from '@/modules/auth/session';
export default async function StoreHeader({ user }: { user?: { name: string; role: string } | null }) { const [categories, resolvedUser] = await Promise.all([listCategories(), user === undefined ? currentUser() : Promise.resolve(user)]); return <Header user={resolvedUser} categories={categories}/>; }
