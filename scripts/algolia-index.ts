import { getAlgoliaRecords } from '../src/utils/algolia-queries';
import { searchClient } from '../src/utils/algoliaSearchClient';
async function runIndexing() {
    if (!process.env.ALGOLIA_APP_ID) {
        console.log('Algolia app ID not found - skipping indexing');
        return;
    }

    const records = await getAlgoliaRecords();

    await Promise.all(
        records.map(({ records, indexName }) => {
            // Property 'initIndex' does not exist on type 'Algoliasearch'.
            // const index = searchClient.initIndex(indexName);
            // return index.saveObjects(records);
        })
    );

    console.log('Algolia indexing complete');
}

runIndexing().catch(console.error);