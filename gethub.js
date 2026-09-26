class Gethub {
  constructor(config) {
    this.owner = config.owner;
    this.repo = config.repo;
    this.container = config.target ? document.querySelector(config.target) : null;
    this.tagsContainer = config.tagsTarget ? document.querySelector(config.tagsTarget) : null;
  }

  // 1. Fetch official Release assets
  async init() {
    if (!this.container) return;

    this.container.innerHTML = "<p>Loading downloads...</p>";

    try {
      const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/releases`);
      if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);

      const releases = await response.json();
      this.container.innerHTML = ""; 

      let hasDownloads = false;

      releases.forEach(release => {
        if (release.assets && release.assets.length > 0) {
          release.assets.forEach(asset => {
            hasDownloads = true;
            const link = document.createElement('a');
            link.href = asset.browser_download_url;
            link.download = asset.name;
            link.className = 'gethub-link';
            
            const fileSizeMB = (asset.size / (1024 * 1024)).toFixed(2);
            link.textContent = `⬇ ${asset.name} (${fileSizeMB} MB)`;

            this.container.appendChild(link);
            this.container.appendChild(document.createElement('br'));
          });
        }
      });

      if (!hasDownloads) {
        this.container.innerHTML = "<p>No downloads found in releases.</p>";
      }

    } catch (error) {
      console.error("Gethub failed to fetch releases:", error);
      this.container.innerHTML = "<p>Failed to load downloads.</p>";
    }
  }

  // 2. Fetch all Git Tags and generate source code zip links
  async initTags() {
    if (!this.tagsContainer) return;

    this.tagsContainer.innerHTML = "<p>Loading source tags...</p>";

    try {
      const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/tags`);
      if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);

      const tags = await response.json();
      this.tagsContainer.innerHTML = "";

      if (tags.length === 0) {
        this.tagsContainer.innerHTML = "<p>No tags found.</p>";
        return;
      }

      tags.forEach(tag => {
        const link = document.createElement('a');
        link.href = tag.zipball_url; 
        link.download = `${this.repo}-${tag.name}.zip`;
        link.className = 'gethub-tag-link';
        link.textContent = `📦 Source Code (${tag.name})`;

        this.tagsContainer.appendChild(link);
        this.tagsContainer.appendChild(document.createElement('br'));
      });

    } catch (error) {
      console.error("Gethub failed to fetch tags:", error);
      this.tagsContainer.innerHTML = "<p>Failed to load tags.</p>";
    }
  }

  // 3. Interactive File Explorer and Search
  async initExplorer(config) {
    const targetEl = document.querySelector(config.target);
    const branch = config.branch || 'main';

    if (!targetEl) return;

    targetEl.innerHTML = `
      <div class="gethub-explorer">
        <input type="text" class="gethub-search-input" placeholder="Search source files...">
        <div class="gethub-file-list"><p>Loading repository structure...</p></div>
      </div>
    `;

    const searchInput = targetEl.querySelector('.gethub-search-input');
    const fileListEl = targetEl.querySelector('.gethub-file-list');

    try {
      const response = await fetch(`https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${branch}?recursive=1`);
      if (!response.ok) throw new Error(`GitHub API error: ${response.statusText}`);

      const data = await response.json();
      const files = data.tree.filter(item => item.type === 'blob');

      const renderFiles = (filterText = '') => {
        fileListEl.innerHTML = '';
        const filtered = files.filter(file => file.path.toLowerCase().includes(filterText.toLowerCase()));

        if (filtered.length === 0) {
          fileListEl.innerHTML = '<p class="gethub-empty">No files found.</p>';
          return;
        }

        filtered.forEach(file => {
          const link = document.createElement('a');
          link.href = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${branch}/${file.path}`;
          link.download = file.path.split('/').pop();
          link.className = 'gethub-file-item';
          link.innerHTML = `📁 <span>${file.path}</span>`;
          fileListEl.appendChild(link);
        });
      };

      renderFiles();

      searchInput.addEventListener('input', (e) => {
        renderFiles(e.target.value);
      });

    } catch (error) {
      console.error("Gethub explorer failed:", error);
      fileListEl.innerHTML = '<p>Failed to load source tree.</p>';
    }
  }
}
