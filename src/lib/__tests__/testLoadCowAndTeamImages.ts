import { loadCowImages, loadTeamImages } from '../loadContent';

async function test() {
    try {
        console.log('Starting to load cow images...');
        const startTime = Date.now();
        const cowImages = await loadCowImages();
        const endTime = Date.now();

        console.log(`Took ${(endTime - startTime) / 1000} seconds`);
        console.log("Loaded " + cowImages.length + " cow images");
        cowImages.slice(0, 3).forEach((cowImage, i) => {
            console.log(cowImage.name, cowImage.src);
        });


    } catch (error) {
        console.error('Error loading cow images:');
        console.error(error);
    } finally {
        // Ensure the process exits, but give time for logs to flush
        setTimeout(() => process.exit(0), 100);
    }
}

async function testTeamImages() {
    try {
        console.log('Starting to load team images...');
        const startTime = Date.now();
        const teamImages = await loadTeamImages();
        const endTime = Date.now();

        console.log(`Took ${(endTime - startTime) / 1000} seconds`);
        console.log("Loaded " + teamImages.length + " team images");
        teamImages.slice(0, 3).forEach((teamImage, i) => {
            console.log(teamImage.name, teamImage.src);
        });
    } catch (error) {
        console.error('Error loading team images:');
        console.error(error);
    } finally {
        // Ensure the process exits, but give time for logs to flush
        setTimeout(() => process.exit(0), 100);
    }
}

// test();
testTeamImages();
