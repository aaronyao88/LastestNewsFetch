import { fetchNews } from '../services/fetcher';
import { translateNewsItem } from '../services/translator';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log('Fetching news...');
    const items = await fetchNews();
    console.log('Fetched items:', items.length);
    if (items.length > 0) {
        console.log('Sample item title:', items[0].title);

        console.log('Testing translation (mock if no key)...');
        const translated = await translateNewsItem(items[0]);
        console.log('Translated title:', translated.title);
    } else {
        console.log('No items fetched. Check RSS URLs.');
    }
}

main();
