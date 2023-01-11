const menuRoot = document.querySelector('#list');
const playerContainer = document.querySelector('#player-container');
const playerFrame = document.querySelector('#player-frame');
const playerCloseButton = document.querySelector('#player-close-button');

function playerFrameLoadHandler() {
    playerContainer.classList.remove('inactive');
}

function startPlayer(file) {
    stopPlayer();
    playerFrame.addEventListener('load', playerFrameLoadHandler);
    playerFrame.src = `nsfplayer.html?cartridge=${file.file}`;
}

function stopPlayer() {
    playerFrame.removeEventListener('load', playerFrameLoadHandler);
    playerFrame.src = '';
    if (!playerContainer.classList.contains('inactive'))
        playerContainer.classList.add('inactive');
}

playerContainer.addEventListener('click', (ev) => {
    if (ev.target === playerContainer)
        stopPlayer();
});
playerCloseButton.addEventListener('click', stopPlayer);

async function createMenuItems() {
    const manifestRequest = await fetch('manifest.json');
    const manifest = await manifestRequest.json();

    for (const file of manifest.files) {
        const listItem = document.createElement('li');

        const image = document.createElement('img');
        image.src = `art/${file.file}.png`;
        image.alt = 'Album art'; // FIXME
        listItem.appendChild(image);

        const itemInfo = document.createElement('div');
        itemInfo.classList.add('list-item-info');

        const itemTitle = document.createElement('div');
        itemTitle.classList.add('list-item-title');
        itemTitle.innerText = file.info.name;
        itemInfo.appendChild(itemTitle);

        const itemCopyright = document.createElement('div');
        itemCopyright.classList.add('list-item-copyright');
        itemCopyright.innerText = file.info.copyright;
        itemInfo.appendChild(itemCopyright);

        listItem.appendChild(itemInfo);

        const downloadLink = document.createElement('a');
        downloadLink.classList.add('list-item-download');
        downloadLink.href = `nsf/${file.file}.nsf`;
        downloadLink.download = `${file.file}.nsf`;

        const downloadIcon = document.createElement('span');
        downloadIcon.classList.add('material-symbols-outlined');
        downloadIcon.innerText = 'download';

        downloadLink.appendChild(downloadIcon);
        downloadLink.insertAdjacentText('beforeend', 'NSF');

        listItem.appendChild(downloadLink);

        listItem.addEventListener('click', (ev) => {
            if (ev.target !== downloadLink && ev.target !== downloadIcon)
                startPlayer(file);
        });

        menuRoot.appendChild(listItem);
    }
}

createMenuItems().then(() => {});
