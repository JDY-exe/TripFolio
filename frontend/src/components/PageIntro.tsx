interface PageIntroProps {
  eyebrow: string
  title: string
  description: string
}

/**
 * Displays a consistent introductory heading for a top-level page.
 *
 * The component arranges a short category label, page title, and supporting
 * description into a reusable responsive header block.
 *
 * @param props - Text displayed in the page introduction.
 * @param props.eyebrow - Short category label shown above the title.
 * @param props.title - Primary page heading.
 * @param props.description - Supporting explanation shown below the heading.
 * @returns A styled page introduction section.
 */
function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <header className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
    </header>
  )
}

export default PageIntro
