import { lazy, type ComponentType } from 'react'

/**
 * `React.lazy` for a named export. Every component here is a named export,
 * and `lazy` only takes a default — so without this each call site repeats
 * the same `.then((m) => ({ default: m.X }))`.
 */
export function lazyNamed<P extends object, K extends string>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K,
): ComponentType<P> {
  return lazy(async () => {
    const component: ComponentType<P> = (await load())[name]
    return { default: component }
  }) as ComponentType<P>
}
