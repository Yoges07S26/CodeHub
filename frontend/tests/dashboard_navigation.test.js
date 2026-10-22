const fs = require('fs');
const path = require('path');
const assert = require('assert');

const appPath = path.join(__dirname, '..', 'public', 'app.jsx');
const compPath = path.join(__dirname, '..', 'src', 'components', 'DashboardView.jsx');
const appSource = fs.readFileSync(appPath, 'utf8');
const compSource = fs.readFileSync(compPath, 'utf8');

[
  { name: 'app.jsx', src: appSource },
  { name: 'DashboardView.jsx', src: compSource }
].forEach(({ name, src }) => {
  // Check Developer Quick Launch buttons
  assert.ok(
    src.includes("triggerNav('jobs')") || src.includes("onNavJobs"),
    `[${name}] Expected Jobs quick action to use onNavJobs or triggerNav`
  );
  assert.ok(
    src.includes("triggerNav('ai')"),
    `[${name}] Expected AI quick action to use triggerNav('ai')`
  );
  assert.ok(
    src.includes("triggerNav('repos')"),
    `[${name}] Expected Repos quick action to use triggerNav('repos')`
  );
  assert.ok(
    src.includes("triggerNav('settings')"),
    `[${name}] Expected Settings quick action to use triggerNav('settings')`
  );

  // Check Recommended Jobs section
  assert.ok(
    src.includes("Explore All Jobs →"),
    `[${name}] Expected Explore All Jobs button to exist`
  );
  assert.ok(
    src.includes("onNavJobs(job.id)") || src.includes("{ jobId: job.id }"),
    `[${name}] Expected Recommended job card and Apply Now button to pass job.id for navigation`
  );
  assert.ok(
    src.includes("Apply Now →"),
    `[${name}] Expected Apply Now button to exist in Recommended Jobs`
  );

  // Assert no leftover window.dispatchEvent in DashboardView quick actions or job cards
  const dashboardStart = src.indexOf('function DashboardView');
  assert.ok(dashboardStart !== -1, `[${name}] Expected DashboardView definition`);
  const dashboardCode = src.slice(dashboardStart);
  const dispatchMatches = dashboardCode.match(/window\.dispatchEvent/g) || [];
  // Only the fallback inside triggerNav itself is allowed
  assert.strictEqual(
    dispatchMatches.length,
    1,
    `[${name}] Only fallback triggerNav should contain window.dispatchEvent, found ${dispatchMatches.length}`
  );
});

console.log('All Dashboard navigation checks passed successfully!');
