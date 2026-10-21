import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const brands = [['google', 'Google', '4285F4'], ['microsoft', 'Microsoft', 'F25022'], ['amazon', 'Amazon', 'FF9900'], ['atlassian', 'Atlassian', '0052CC'], ['salesforce', 'Salesforce', '00A1E0'], ['nvidia', 'NVIDIA', '76B900'], ['servicenow', 'ServiceNow', '238631'], ['stripe', 'Stripe', '635BFF'], ['adobe', 'Adobe', 'FF0000'], ['cisco', 'Cisco', '1687B3'], ['ibm', 'IBM', '052FAD'], ['oracle', 'Oracle', 'F80000'], ['sap', 'SAP', '0FAAFF'], ['uber', 'Uber', '111111'], ['walmart', 'Walmart Global Tech', '0071CE'], ['meta', 'Meta', '0866FF'], ['apple', 'Apple', '111111'], ['qualcomm', 'Qualcomm', '3253DC'], ['intuit', 'Intuit', '236CFF'], ['jpmorganchase', 'JPMorganChase', '111111']];
brands.push(['accenture', 'Accenture', 'A100FF'], ['infosys', 'Infosys', '007CC3'], ['tcs', 'TCS', 'EE3984'], ['wipro', 'Wipro', '341C53'], ['hcltech', 'HCLTech', '006BB6'], ['cognizant', 'Cognizant', '1A4CA1'], ['capgemini', 'Capgemini', '0070AD'], ['deloitte', 'Deloitte', '86BC25'], ['ey', 'EY', 'DAA900'], ['techmahindra', 'Tech Mahindra', 'D71920'], ['thoughtworks', 'Thoughtworks', 'CC1354'], ['zoho', 'Zoho', 'E42527'], ['freshworks', 'Freshworks', '008A80'], ['razorpay', 'Razorpay', '0C2451'], ['phonepe', 'PhonePe', '5F259F'], ['paytm', 'Paytm', '20336B'], ['flipkart', 'Flipkart', '2874F0'], ['swiggy', 'Swiggy', 'FC8019'], ['zomato', 'Zomato', 'E23744'], ['meesho', 'Meesho', 'CC1F88'], ['databricks', 'Databricks', 'FF3621'], ['snowflake', 'Snowflake', '29B5E8'], ['mongodb', 'MongoDB', '47A248'], ['cloudflare', 'Cloudflare', 'F38020'], ['redhat', 'Red Hat', 'EE0000'], ['github', 'GitHub', '181717'], ['gitlab', 'GitLab', 'FC6D26'], ['docker', 'Docker', '2496ED'], ['elastic', 'Elastic', '005571'], ['spotify', 'Spotify', '16833F'], ['samsung', 'Samsung', '1428A0'], ['intel', 'Intel', '0071C5'], ['amd', 'AMD', 'ED1C24'], ['goldmansachs', 'Goldman Sachs', '7399C6'], ['morganstanley', 'Morgan Stanley', '111111'], ['americanexpress', 'American Express', '2E77BC'], ['dell', 'Dell Technologies', '007DB8'], ['hp', 'HP', '0096D6'], ['paypal', 'PayPal', '003087'], ['visa', 'Visa', '1A1F71']);
brands.push(['figma', 'Figma', 'F24E1E']);
brands.push(['mdnwebdocs', 'MDN Web Docs', '111111'], ['react', 'React', '087EA4'], ['python', 'Python Software Foundation', '3776AB'], ['postgresql', 'PostgreSQL', '4169E1'], ['kubernetes', 'Kubernetes', '326CE5'], ['freecodecamp', 'freeCodeCamp', '0A0A23']);
mkdirSync('public/brands', {
  recursive: true
});
const records = [];
const previous = existsSync('shared/content/brands.json') ? JSON.parse(readFileSync('shared/content/brands.json', 'utf8')) : [];
const refresh = process.argv.includes('--refresh');
const official = {
  hcltech: 'https://rmkcdn.successfactors.com/147eb21f/9cddc83c-dccc-437a-91b7-0.jpg',
  capgemini: 'https://www.capgemini.com/wp-content/uploads/2025/10/cropped-Capgemini_spade_32x32.png?w=180',
  deloitte: 'https://www.deloitte.com/content/dam/assets-shared/icons/global/apple-icon-114x114.png',
  ey: 'https://www.ey.com/content/dam/ey-unified-site/icon/ey-favicon.jpg',
  techmahindra: 'https://careers.techmahindra.com/Images/apple-touch-icon.png',
  thoughtworks: 'https://www.thoughtworks.com/etc.clientlibs/thoughtworks/clientlibs/clientlib-site/resources/images/android-chrome-192x192.png',
  freshworks: 'https://www.freshworks.com/favicons/apple-touch-icon.png',
  meesho: 'https://www.meesho.io/img/meesho-logo.png',
  morganstanley: 'https://www.morganstanley.com/etc.clientlibs/msdotcom/clientlibs/site/resources/image/apple-touch-icon-144x144.png',
  servicenow: 'https://www.servicenow.com/content/dam/servicenow-assets/public/en-us/images/apple-touch-icon/180x180.png',
  jpmorganchase: 'https://www.jpmorganchase.com/etc.clientlibs/cws/clientlibs/clientlib-base/resources/jpmc/images/jpmc-favicon-120.png'
};
for (let i = 0; i < brands.length; i += 4) await Promise.all(brands.slice(i, i + 4).map(async ([slug, name, color]) => {
  const cached = previous.find(b => b.slug === slug);
  if (!refresh && cached?.path && existsSync('public' + cached.path)) {
    records.push(cached);
    return;
  }
  const source = official[slug] || 'https://cdn.jsdelivr.net/npm/simple-icons@11.15.0/icons/' + slug + '.svg';
  try {
    const response = await fetch(source, {
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    if (official[slug]) {
      const bytes = Buffer.from(await response.arrayBuffer());
      const extension = bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' ? 'png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg' : bytes.subarray(0, 4).toString('hex') === '00000100' ? 'ico' : null;
      if (bytes.length > 200000 || !extension) throw new Error('Unexpected company image content.');
      writeFileSync('public/brands/' + slug + '.' + extension, bytes);
      records.push({
        slug,
        name,
        color,
        path: '/brands/' + slug + '.' + extension,
        source,
        collection: 'Official company website icon',
        retrievedAt: new Date().toISOString().slice(0, 10)
      });
      return;
    }
    const svg = await response.text();
    if (!svg.includes('<svg') || /<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=/i.test(svg) || svg.length > 100000) throw new Error('Unexpected SVG content.');
    const colored = svg.replace('<svg ', '<svg fill="#' + color + '" ');
    writeFileSync('public/brands/' + slug + '.svg', colored);
    records.push({
      slug,
      name,
      color,
      path: '/brands/' + slug + '.svg',
      source,
      collection: 'Simple Icons 11.15.0',
      retrievedAt: new Date().toISOString().slice(0, 10)
    });
  } catch (error) {
    if (cached?.path && existsSync('public' + cached.path)) {
      records.push({
        ...cached,
        refreshError: error.message
      });
      return;
    }
    records.push({
      slug,
      name,
      color,
      path: null,
      source,
      error: error.message
    });
  }
}));
records.sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync('shared/content/brands.json', JSON.stringify(records, null, 2) + '\n');
writeFileSync('shared/content/brand-art.json', JSON.stringify(records.map(({
  slug,
  name,
  color,
  path
}) => ({
  slug,
  name,
  color,
  path
}))) + '\n');
console.log(JSON.stringify({
  downloaded: records.filter(r => r.path).length,
  unavailable: records.filter(r => !r.path).map(r => ({
    name: r.name,
    error: r.error
  }))
}));
