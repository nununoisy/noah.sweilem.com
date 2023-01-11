#!/usr/bin/env node

// Requires Node.js 17+

const fs = require('fs');

const CLIENT_ID = process.env['CLIENT_ID'];
const CLIENT_SECRET = process.env['CLIENT_SECRET'];

async function twitchOAuthFlow() {
    const authParams = new URLSearchParams();
    authParams.append('client_id', CLIENT_ID);
    authParams.append('client_secret', CLIENT_SECRET);
    authParams.append('grant_type', 'client_credentials');

    const authRequest = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: authParams
    });
    const authResponse = await authRequest.json();

    return authResponse['access_token'];
}

function parseNSFHeader(filename) {
    const cartData = fs.readFileSync(filename);

    const magic = cartData.subarray(0, 5).toString('ascii');
    if (magic !== 'NESM\x1a') {
        console.log('NSF magic invalid');
        return;
    }

    const version = cartData[5];
    if (version !== 1 && version !== 2) {
        console.log(`NSF version ${version} invalid`);
        return;
    }

    function parse_nsf_metadata_string(offset) {
        const endOffset = cartData.indexOf(0, offset);  // Find null terminator
        if (endOffset === -1 || endOffset - offset > 32)
            return '';
        else
            return cartData.subarray(offset, endOffset).toString('ascii');
    }

    const name = parse_nsf_metadata_string(0xE);
    const artist = parse_nsf_metadata_string(0x2E);
    const copyright = parse_nsf_metadata_string(0x4E);

    const expansionChips = ["VRC6", "VRC7", "FDS", "MMC5", "N163", "S5B", "VT02+"]
        .filter((_, i) => cartData[0x7B] & (1 << i));

    return { version, expansionChips, name, artist, copyright };
}

function levenshteinDistance(str1 = '', str2 = '') {
    const track = Array(str2.length + 1).fill(null)
        .map(() => Array(str1.length + 1).fill(null));
    for (let i = 0; i <= str1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
        track[j][0] = j;
    }
    for (let j = 1; j <= str2.length; j += 1) {
        for (let i = 1; i <= str1.length; i += 1) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator, // substitution
            );
        }
    }
    return track[str2.length][str1.length];
};

async function getGameInfo(token, name) {
    const idRequest = await fetch(`https://api.igdb.com/v4/games`, {
        method: 'POST',
        headers: {
            'Client-ID': CLIENT_ID,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain',
            'Accept': 'application/json'
        },
        body: `search "${name}"; fields name; where version_parent = null & category = (0,2,3,4,8,9);`
    });
    const idResponse = await idRequest.json();

    return idResponse
        .filter((game) => game.name.includes(name))
        .sort((a, b) => levenshteinDistance(a.name, name) - levenshteinDistance(b.name, name))
        .sort((a, b) => a.id - b.id)
        [0];
}

async function getGameArtByID(token, id) {
    const artRequest = await fetch(`https://api.igdb.com/v4/covers`, {
        method: 'POST',
        headers: {
            'Client-ID': CLIENT_ID,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain',
            'Accept': 'application/json'
        },
        body: `fields image_id; where game = ${id};`
    });
    const artResponse = await artRequest.json();
    const artUrl = `https://images.igdb.com/igdb/image/upload/t_cover_big/${artResponse[0].image_id}.png`
    console.log('Found art:', artUrl);
    return artUrl;
}

async function getArtByName(token, name) {
    const gameInfo = await getGameInfo(token, name);
    console.log('Found game:', gameInfo.name);
    return await getGameArtByID(token, gameInfo.id);
}

async function getArtForNSF(token, filename) {
    console.log('For NSF:', filename);
    const nsfInfo = parseNSFHeader(filename);
    console.log(nsfInfo);
    return await getArtByName(token, nsfInfo.copyright);
}

async function downloadArt(url, filename) {
    const writeStream = fs.createWriteStream(filename);
    const downloadRequest = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'image/png'
        }
    });
    const writableStream = new WritableStream({
        write(chunk) {
            writeStream.write(chunk);
        },
    });
    await downloadRequest.body.pipeTo(writableStream);
}

(async () => {
    const token = await twitchOAuthFlow();

    const files = fs.readdirSync('nsf')
        .filter((f) => f.endsWith('.nsf'))
        // .sort((a, b) => fs.statSync(`nsf/${a}`).birthtime - fs.statSync(`nsf/${b}`).birthtime)
        .map((f) => ({
            file: f.replace(/\.nsf$/, ''),
            info: parseNSFHeader(`nsf/${f}`)
        }))
        .sort((a, b) => {
            if (a.info.copyright === b.info.copyright)
                return a.info.name.localeCompare(b.info.name);
            return a.info.copyright.localeCompare(b.info.copyright);
        });

    for (const { file } of files) {
        const art = await getArtForNSF(token, `nsf/${file}.nsf`);
        await downloadArt(art, `art/${file}.png`);
    }

    fs.writeFileSync('manifest.json', JSON.stringify({ files }));
})();
