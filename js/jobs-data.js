/* Internship postings to track (demo). Merged into the Internships page on load (see mergeSeedJobs in jobs.js):
   new ids are added as "To apply"; ids already in the list, or deleted by the user, are left alone.
   Ids must stay stable. Fields: id, company, role, where, url, deadline (YYYY-MM-DD), track (data|software|security|finance), notes. */
const SEED_JOBS = [
  {"id":"demo-data","track":"data","company":"Example Analytics","role":"Data Science Intern","where":"Zurich","url":"","deadline":"2026-11-30","notes":"Demo entry."},
  {"id":"demo-swe","track":"software","company":"Example Systems","role":"Software Engineering Intern","where":"Lausanne","url":"","deadline":"2026-12-15","notes":"Demo entry."},
  {"id":"demo-quant","track":"finance","company":"Example Trading","role":"Quantitative Trader Intern","where":"Amsterdam","url":"","deadline":"2027-01-10","notes":"Demo entry."},
];
