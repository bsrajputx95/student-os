// Run through the Codex CUA runtime with an authenticated sample student tab.
// All interaction stays on the documented tab API. No direct API/state access.
const expect = (value, message) => {
  if (!value) throw new Error(message);
};
export async function studentSmoke(tab, origin = 'http://127.0.0.1:5180') {
  const results = [];
  const pages = [['/career?tab=resume', 'A resume you can stand behind.'], ['/practice?tab=judged', 'Trusted coding practice'], ['/practice?tab=interview', 'Practise a real conversation.'], ['/practice?tab=challenges', 'One campus. A daily challenge.'], ['/learn?tab=certificates', 'Credential wallet'], ['/learn?tab=videos', 'See what you’ll learn.'], ['/learn?tab=resources', 'Learn from the people who build it.'], ['/community', 'Built together. Better together.'], ['/help', 'Help, without the maze.']];
  for (const [route, title] of pages) {
    await tab.goto(origin + route);
    await tab.playwright.getByRole('heading', {
      name: title,
      exact: true
    }).waitFor({
      state: 'visible'
    });
    const shape = await tab.playwright.evaluate(() => ({
      width: innerWidth,
      content: document.documentElement.scrollWidth,
      unnamed: [...document.querySelectorAll('button')].filter(e => e.getBoundingClientRect().width && !(e.textContent.trim() || e.getAttribute('aria-label') || e.getAttribute('title'))).length
    }));
    expect(shape.content <= shape.width + 2, route + ' overflows the viewport.');
    expect(shape.unnamed === 0, route + ' has unnamed buttons.');
    results.push({
      route,
      ...shape
    });
  }
  return results;
}
export async function staffSmoke(tab, origin = 'http://127.0.0.1:5180') {
  await tab.goto(origin + '/staff/assignments');
  await tab.playwright.getByRole('button', {
    name: 'Create new work',
    exact: true
  }).waitFor({
    state: 'visible'
  });
  await tab.playwright.getByRole('tab', {
    name: 'Question banks',
    exact: true
  }).click();
  await tab.playwright.getByRole('button', {
    name: 'Create a quiz',
    exact: true
  }).waitFor({
    state: 'visible'
  });
  return {
    questionAuthoring: true
  };
}
