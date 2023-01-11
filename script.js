const eTop = document.getElementById("top");
const appbar = document.getElementById("appbar");
const navbar = document.getElementById("navbar");
const initialSidebar = document.getElementById("initial-sidebar");
const initialSidebarSpacer = document.getElementById("initial-sidebar-spacer");
const initialHeader = document.getElementById("initial-header");
const content = document.getElementById("content");
const sectionHeaders = document.querySelectorAll(".section-header");
const scrollDownIndicators = document.querySelectorAll(".initial-scroll-down-indicator");
const resumeCanvas = document.getElementById("resume-canvas");

const mobileSize = () => window.innerWidth >= 750;

const doAnimationFrame = (ts) => {
    // setup
    const h = window.innerHeight;
    const w = window.innerWidth;
    const y = Math.abs(eTop.getBoundingClientRect().top);

    // navbar
    const navbarItems = document.querySelectorAll(".navbar-item");

    if (y/h < 0.95) {
        appbar.style.height = '0';
    } else {
        appbar.style.height = '104px';
    }

    let hasFoundActiveSection = false;
    for (const [i, sectionHeader] of sectionHeaders.entries()) {
        const pageAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight;
        const bounds = sectionHeader.parentElement.getBoundingClientRect();
        const navbarItem = navbarItems.item(parseInt(sectionHeader.dataset.sectionId, 10));
        if (((bounds.bottom > 104 && !pageAtBottom) || (i === sectionHeaders.length - 1 && pageAtBottom))
                && !hasFoundActiveSection) {
            hasFoundActiveSection = true;
            if (!navbarItem.classList.contains("navbar-item-active")) {
                navbarItem.classList.add("navbar-item-active");

                const navbarItemBounds = navbarItem.getBoundingClientRect();
                if (navbarItemBounds.left < 0 || navbarItemBounds.right > window.innerWidth)
                    navbar.scrollTo({
                        top: navbarItemBounds.top,
                        left: navbarItemBounds.left,
                        behavior: "smooth"
                    });
            }
        } else {
            navbarItem.classList.remove("navbar-item-active");
        }
    }

    // initial sidebar/header
    if (y < h) {
        initialSidebar.style.display = 'flex';
        initialSidebar.style.width = `${Math.min((w-w*(y/h))/2, 560)}px`;
        initialSidebarSpacer.style.width = `${Math.min((w-w*(y/h))/2, 560)}px`;
        initialHeader.style.opacity = `${Math.max(0, 1-(y/h))}`;
        initialHeader.style.display = 'flex';
    } else {
        initialSidebar.style.display = 'none';
        initialHeader.style.display = 'none';
    }

    // content
    if (y/h < 0.95) {
        content.style.opacity = '0';
    } else {
        content.style.opacity = '1';
    }

    requestAnimationFrame(doAnimationFrame);
}

const calculateAge = () => {
    const eAge = document.getElementById("age");
    const birthDate = Date.UTC(2001, 1, 6, 19, 0, 0, 0);
    const ageMsDiff = Date.now() - birthDate;
    const ageDate = new Date(ageMsDiff);
    eAge.innerText = `${Math.abs(ageDate.getUTCFullYear() - 1970)}`;
}

const scrollToSection = (sectionId) => {
    const sectionHeader = sectionHeaders[sectionId];
    const sectionHeaderBounds = sectionHeader.getBoundingClientRect();

    window.scrollTo({
        top: window.scrollY + sectionHeaderBounds.top - 104,
        left: 0,
        behavior: 'smooth'
    });

    const navbarItem = document.querySelectorAll(".navbar-item").item(sectionId);
    const navbarItemBounds = navbarItem.getBoundingClientRect();
    if (navbarItemBounds.left < 0 || navbarItemBounds.right > window.innerWidth)
        navbar.scrollTo({
            top: navbarItemBounds.top,
            left: navbarItemBounds.left,
            behavior: "smooth"
        });
}

const generateNavbar = () => {
    sectionHeaders.forEach((sectionHeader, idx) => {
        const navbarItem = document.createElement("div");
        navbarItem.classList.add("navbar-item");
        navbarItem.innerText = sectionHeader.innerHTML;

        sectionHeader.setAttribute("data-section-id", idx.toString(10));
        navbarItem.setAttribute("data-section-id", idx.toString(10));
        navbarItem.setAttribute("role", "menuitem");

        navbarItem.addEventListener("click", (ev) => scrollToSection(ev.target.dataset.sectionId));

        navbar.appendChild(navbarItem);
    });
}

const loadPage = async () => {
    calculateAge();
    generateNavbar();
    for (const indicator of scrollDownIndicators)
        indicator.addEventListener('click', () => scrollToSection(0));
    requestAnimationFrame(doAnimationFrame);

    const pdfJsLib = window["pdfjs-dist/build/pdf"];
    pdfJsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

    const pdf = await pdfJsLib.getDocument('/resume.pdf').promise;
    const page = await pdf.getPage(1);

    const scale = mobileSize() ? 1.5 : 1;
    const viewport = page.getViewport({ scale });
    resumeCanvas.height = viewport.height;
    resumeCanvas.width = viewport.width;

    await page.render({
        canvasContext: resumeCanvas.getContext('2d'),
        viewport
    });

    resumeCanvas.classList.add('loaded');
};

loadPage().catch(console.error);
