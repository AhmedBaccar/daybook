/* COURSE DATA (demo). In the real app this file is rewritten every week by a scheduled updater.
 * Bump SEED_VERSION after any change so the app merges it into existing subjects. */

const SEED_VERSION = 1;
/* WEEKLY-UPDATE: rewritten by the scheduled updater. null = nothing to show. */
const LAST_UPDATE = null;

function seedSubjects(){
  const adaLec = ['Intro','Handling data','Visualizing data','Describing data','Regression analysis for disentangling data',
    'Causal analysis of observational data','Learning from data: Supervised learning','Learning from data: Applied ML',
    'Learning from data: Unsupervised learning','Handling text data','Handling text data (part 2)','Scaling to massive data',
    'Handling network data','ADA in action'];
  const adaLab = ['Intro to tools','Handling data','Data viz & data from the web','Describing data',
    'Regression analysis','Causal analysis','Supervised learning','Applied ML','Unsupervised learning','Handling text data',
    'Handling text data','Scaling up','Handling network data',''];
  const adaTopics = {};
  for (let n = 1; n <= 14; n++) {
    adaTopics[n] = { lec: adaLec[n-1], lab: adaLab[n-1], hw: n === 1 ? '' : `HW ${n-1} · ${adaLec[n-2]}` };
  }

  const mlLec = [
    ['Introduction, Linear Regression','Loss functions'],
    ['Optimization','Optimization (cont.)'],
    ['Least Squares, Overfitting','Max Likelihood, Ridge Regression, Lasso'],
    ['Generalization, Model Selection & Validation','Bias-Variance decomposition'],
    ['Classification','Logistic Regression'],
    ['Support Vector Machines','K-Nearest Neighbor'],
    ['Kernel Regression','Neural Networks: Basics, Representation Power'],
    ['NN: Backpropagation, Activation Functions','NN: CNNs, Regularization, Data Augmentation, Dropout'],
    ['NN: Transformers','Adversarial ML'],
    ['Ethics and Fairness in ML','Unsupervised Learning, K-Means, GMM'],
    ['Gaussian Mixture Models, EM algorithm','Matrix Factorizations'],
    ['Text Representation Learning','LLMs'],
    ['LLMs, Self-supervised Learning','GANs and Diffusion models'],
    ['Guest lecture','Project pitch session (optional)'],
  ];
  const mlTopics = {};
  for (let n = 1; n <= 14; n++) mlTopics[n] = { l1: mlLec[n-1][0], l2: mlLec[n-1][1], ex: `Lab ${n}` };

  const finTopics = {};
  ['Time value of money','Discounting and valuation','Capital budgeting','Bonds','Stocks','Risk and return',
   'Portfolio theory','CAPM','Market efficiency','Capital structure','Payout policy','Options','Options (cont.)','Review']
    .forEach((t, i) => finTopics[i+1] = { lec: t, ex: 'Exercises · ' + t, hw: `Assignment · ${t}` });

  return applyLinks([
    {
      id:'ada', code:'CS-401', name:'Applied Data Analysis', color:'#8f86c9',
      links:[
        {label:'Course site', url:'https://epfl-ada.github.io/teaching/fall2026/cs401/'},
      ],
      slots:[
        {id:'lec', kind:'lecture', label:'Lecture', day:2, time:'08:15', where:'Rolex Forum'},
        {id:'lab', kind:'exercise', label:'Lab session', day:4, time:'15:15', where:'CE building'},
        {id:'hw', kind:'homework', label:'Weekly homework', day:4, time:'23:59', graded:true, where:'10% of grade'},
      ],
      topics: adaTopics, notes:{},
      skip: { 1:['hw'], 14:['lab'] },
      deadlines:[
        {id:'ada-p1', title:'P1 · Three project ideas', date:'2026-10-02T23:59', kind:'project', weight:'3% of grade'},
        {id:'ada-p2', title:'P2 · Proposal + initial analyses', date:'2026-11-06T23:59', kind:'project', weight:'6% of grade'},
        {id:'ada-p3', title:'P3 · Final project + data story', date:'2026-12-18T23:59', kind:'project', weight:'21% of grade'},
        {id:'ada-exam', title:'Final exam · mini data-analysis project', date:'2027-01-12T15:15', kind:'exam', weight:'60%'},
      ],
    },
    {
      id:'ml', code:'CS-433', name:'Machine Learning', color:'#5fa8b8',
      links:[
        {label:'Course site', url:'https://www.epfl.ch/labs/mlo/machine-learning-cs-433/'},
        {label:'GitHub (slides, labs)', url:'https://github.com/epfml/ML_course'},
      ],
      slots:[
        {id:'l1', kind:'lecture', label:'Lecture (Tue)', day:1, time:'16:15', where:'Rolex Forum'},
        {id:'l2', kind:'lecture', label:'Lecture (Wed)', day:2, time:'10:15', where:'Rolex Forum'},
        {id:'ex', kind:'exercise', label:'Exercise session', day:3, time:'14:15', where:''},
      ],
      topics: mlTopics, notes:{},
      skip: { 14:['ex'] },
      deadlines:[
        {id:'ml-p1', title:'Project 1 (optional, feedback only)', date:'2026-10-29T23:59', kind:'project', weight:'0%'},
        {id:'ml-p2', title:'Project 2', date:'2026-12-17T23:59', kind:'project', weight:'30%'},
        {id:'ml-exam', title:'Final exam', date:'2027-01-11T15:15', kind:'exam', weight:'70%'},
      ],
    },
    {
      id:'fin', code:'MGT-482', name:'Principles of Finance', color:'#d6a347',
      links:[],
      slots:[
        {id:'lec', kind:'lecture', label:'Lecture', day:0, time:'09:15', where:''},
        {id:'ex', kind:'exercise', label:'Exercise session', day:0, time:'11:15', where:''},
        {id:'hw', kind:'homework', label:'Group assignment', day:6, time:'23:59', graded:true, where:'best 6 of 8'},
      ],
      topics: finTopics, notes:{},
      skip: { 1:['hw'], 14:['hw'] },
      deadlines:[
        {id:'fin-case', title:'Case study #1', date:'2026-11-08T23:59', kind:'homework', weight:'20% of grade'},
        {id:'fin-exam', title:'Final exam (closed book)', date:'2027-01-25T09:00', kind:'exam', weight:'65% of grade'},
      ],
    },
  ]);
}

/** Where each item/deadline points to (course page, forum thread). Empty in the demo. */
const SEED_LINKS = {};

/**
 * How each course is graded. score = points out of 100 already known;
 * auto:'hw' derives the score from the homework ticks in this app.
 */
const SEED_GRADING = {
  ada: { scale:'Example weights.', parts:[
    {id:'hw', label:'Weekly homework (do it = full marks)', weight:10, auto:'hw'},
    {id:'p', label:'Project P1 + P2 + P3', weight:30},
    {id:'exam', label:'Final exam', weight:60},
  ]},
  ml: { scale:'Example weights.', parts:[
    {id:'p2', label:'Project 2', weight:30},
    {id:'exam', label:'Final exam', weight:70},
  ]},
  fin: { scale:'Example weights.', parts:[
    {id:'asg', label:'Assignments · best 6 of 8', weight:35},
    {id:'exam', label:'Final exam', weight:65},
  ]},
};
