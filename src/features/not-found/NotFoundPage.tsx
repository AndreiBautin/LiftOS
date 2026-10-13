import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Empty } from '@/components/shared/primitives'
import { buttonStyles } from '@/components/shared/styles'
import { cn } from '@/lib/cn'

export function NotFoundPage() {
  return (
    <Empty title="Nothing here" art={<Compass size={20} />}>
      <p>That page does not exist.</p>
      <Link viewTransition to="/today" className={cn(buttonStyles({ variant: 'primary' }), 'mt-4')}>
        Back home
      </Link>
    </Empty>
  )
}
