import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'

const PAGES = [
  { hash: '#/', label: 'Devices' },
  { hash: '#/sites', label: 'Sites' },
]

/**
 * Nav and theme toggle as one compact unit, rendered inside each page's own
 * header rather than as a bar above it — the site page has no vertical space
 * to spare.
 */
export function PageNav({ route }: { route: string }) {
  const { theme, toggle } = useTheme()

  return (
    <div className="flex items-center gap-1">
      {PAGES.map((page) => {
        const active = route === page.hash
        return (
          <a
            key={page.hash}
            href={page.hash}
            aria-current={active ? 'page' : undefined}
            className={`focus-visible:ring-ring rounded-sm px-2 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none ${
              active
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {page.label}
          </a>
        )
      })}

      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      </Button>
    </div>
  )
}
