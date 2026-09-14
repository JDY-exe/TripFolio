import PageIntro from '../../components/PageIntro';

/**
 * Presents the placeholder search experience for trips and travel content.
 *
 * @returns The search page.
 */
function Search() {
  return (
    <section>
      <PageIntro
        eyebrow="Discover"
        title="Search"
        description="Find trips, destinations, reservations, and saved travel ideas."
      />
    </section>
  );
}

export default Search;
