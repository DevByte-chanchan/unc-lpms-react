import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, FileText, Globe, Upload, AlertTriangle, AlertCircle } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import styles from '../../../styles/ReferenceLibrary.module.scss';

import { getReferences, setReferences, addReference, updateReference, deleteReference, archiveReference, unarchiveReference, getReferenceComments, addReferenceComment } from '../../../utils/referenceLibrary.js';
import { getRoleName } from '../../../utils/roleIdentities.js';
import { syllabiData } from '../../../data/syllabiData.js';
import * as XLSX from 'xlsx';

const PROGRAM_MAP = {
  'BSCS': 'BS Computer Science',
  'BSIT': 'BS Information Technology',
  'BSBA': 'BS Business Administration',
  'BSE': 'BS Education',
  'BSN': 'BS Nursing',
  'BSA': 'BS Accountancy',
  'BSPsych': 'BS Psychology',
  'BSMA': 'BS Management Accounting',
  'BSHM': 'BS Hospitality Management',
  'BSTM': 'BS Tourism Management',
  'BSRT': 'BS Radiologic Technology',
  'BSMT': 'BS Medical Technology',
  'BSPH': 'BS Public Health',
  'BSPT': 'BS Physical Therapy',
  'BSNursing': 'BS Nursing',
  'BSARCH': 'BS Architecture',
  'BSCpE': 'BS Computer Engineering',
  'BSEE': 'BS Electrical Engineering',
  'BSCIE': 'BS Civil Engineering',
  'BSME': 'BS Mechanical Engineering',
  'BSChE': 'BS Chemical Engineering',
  'BSIE': 'BS Industrial Engineering',
  'BSECE': 'BS Electronics Engineering',
  'GE': 'General Education',
};

const DEPARTMENT_MAP = {
  'BSCS': 'School of Computing and Information Sciences',
  'BSIT': 'School of Computing and Information Sciences',
  'BSCpE': 'School of Computing and Information Sciences',
  'BSBA': 'College of Business and Accountancy',
  'BSA': 'College of Business and Accountancy',
  'BSMA': 'College of Business and Accountancy',
  'BSHM': 'College of Business and Accountancy',
  'BSTM': 'College of Business and Accountancy',
  'BSE': 'College of Education and Arts & Sciences',
  'BSPsych': 'College of Education and Arts & Sciences',
  'BSN': 'College of Nursing and Allied Health Sciences',
  'BSRT': 'College of Nursing and Allied Health Sciences',
  'BSMT': 'College of Nursing and Allied Health Sciences',
  'BSPH': 'College of Nursing and Allied Health Sciences',
  'BSPT': 'College of Nursing and Allied Health Sciences',
  'BSARCH': 'College of Engineering and Architecture',
  'BSEE': 'College of Engineering and Architecture',
  'BSCIE': 'College of Engineering and Architecture',
  'BSME': 'College of Engineering and Architecture',
  'BSChE': 'College of Engineering and Architecture',
  'BSIE': 'College of Engineering and Architecture',
  'BSECE': 'College of Engineering and Architecture',
  'GE': 'General Education Department',
};

const extractProgramPrefix = (code) => {
  if (!code) return 'GE';
  const match = code.match(/^([A-Za-z]+)/);
  if (!match) return 'GE';
  const prefix = match[1].toUpperCase();
  if (prefix.startsWith('BSCS')) return 'BSCS';
  if (prefix.startsWith('BSIT')) return 'BSIT';
  if (prefix.startsWith('BSCPE') || prefix.startsWith('BSCP')) return 'BSCpE';
  if (prefix.startsWith('BSBA')) return 'BSBA';
  if (prefix.startsWith('BSA')) return 'BSA';
  if (prefix.startsWith('BSMA')) return 'BSMA';
  if (prefix.startsWith('BSHM')) return 'BSHM';
  if (prefix.startsWith('BSTM')) return 'BSTM';
  if (prefix.startsWith('BSE')) return 'BSE';
  if (prefix.startsWith('BSPSYCH')) return 'BSPsych';
  if (prefix.startsWith('BSN')) return 'BSN';
  if (prefix.startsWith('BSRT')) return 'BSRT';
  if (prefix.startsWith('BSMT')) return 'BSMT';
  if (prefix.startsWith('BSPH')) return 'BSPH';
  if (prefix.startsWith('BSPT')) return 'BSPT';
  if (prefix.startsWith('BSARCH')) return 'BSARCH';
  if (prefix.startsWith('BSEE')) return 'BSEE';
  if (prefix.startsWith('BSCIE') || prefix.startsWith('BSCE')) return 'BSCIE';
  if (prefix.startsWith('BSME')) return 'BSME';
  if (prefix.startsWith('BSCH')) return 'BSChE';
  if (prefix.startsWith('BSIE')) return 'BSIE';
  if (prefix.startsWith('BSECE') || prefix.startsWith('BSELEC')) return 'BSECE';
  return 'GE';
};

const getProgramName = (prefix) => PROGRAM_MAP[prefix] || PROGRAM_MAP['GE'];
const getDepartmentName = (prefix) => DEPARTMENT_MAP[prefix] || DEPARTMENT_MAP['GE'];

const DEPARTMENT_COLORS = {
  'School of Computing and Information Sciences': '#3b82f6',
  'College of Business and Accountancy': '#f97316',
  'College of Education and Arts & Sciences': '#ec4899',
  'College of Nursing and Allied Health Sciences': '#14b8a6',
  'College of Engineering and Architecture': '#a855f7',
  'General Education Department': '#6b7280',
};

const DEPARTMENT_SHORT = {
  'School of Computing and Information Sciences': 'SCIS',
  'College of Business and Accountancy': 'CBA',
  'College of Education and Arts & Sciences': 'CEAS',
  'College of Nursing and Allied Health Sciences': 'CNAHS',
  'College of Engineering and Architecture': 'CEA',
  'General Education Department': 'GenEd',
};

const getDeptColor = (dept) => DEPARTMENT_COLORS[dept] || '#9ca3af';
const getDeptShort = (dept) => DEPARTMENT_SHORT[dept] || dept;

const ReferenceLibrary = () => {
  const navigate = useNavigate();
  const [references, setReferencesState] = useState(() => getReferences(true));
  const [filterType, setFilterType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [tab, setTab] = useState('active');
  const activeRefs = useMemo(() => references.filter(r => !r.archived), [references]);
  const archivedRefs = useMemo(() => references.filter(r => r.archived), [references]);
  const CURRENT_YEAR = new Date().getFullYear();
  const isDeprecated = (ref) => {
    if (!ref.year) return false;
    const y = typeof ref.year === 'string' ? parseInt(ref.year) : ref.year;
    return !isNaN(y) && CURRENT_YEAR - y >= 5;
  };
  const hasIssues = (ref) => ref.hasIssue === true;

  /* ── Seed from instructor data on first load ─────────────────────── */
  useEffect(() => {
    const existing = getReferences(true);

    // Force migration: populate departments/programs/usedInCourses for ALL existing refs
    const courseRefMap = {};
    syllabiData.forEach(s => {
      const prefix = extractProgramPrefix(s.code);
      const program = getProgramName(prefix);
      const department = getDepartmentName(prefix);
      if (s.references && Array.isArray(s.references)) {
        s.references.forEach(ref => {
          if (!courseRefMap[ref.id]) courseRefMap[ref.id] = { departments: [], programs: [], usedInCourses: [] };
          if (!courseRefMap[ref.id].departments.includes(department)) courseRefMap[ref.id].departments.push(department);
          if (!courseRefMap[ref.id].programs.includes(program)) courseRefMap[ref.id].programs.push(program);
          if (!courseRefMap[ref.id].usedInCourses.includes(s.code)) courseRefMap[ref.id].usedInCourses.push(s.code);
        });
      }
    });

    let migrated = false;
    const migratedRefs = existing.map(r => {
      const mapped = courseRefMap[r.id];
      const hasData = (r.departments && r.departments.length > 0) || (r.programs && r.programs.length > 0);
      if (mapped && !hasData) {
        migrated = true;
        return { ...r, ...mapped };
      }
      if (!r.departments || !r.programs || !r.usedInCourses) {
        migrated = true;
        return {
          ...r,
          departments: r.departments || [],
          programs: r.programs || [],
          usedInCourses: r.usedInCourses || [],
        };
      }
      return r;
    });

    if (migrated) {
      setReferences(migratedRefs);
      setReferencesState(migratedRefs);
      setReferences(migratedRefs);
    }

    // Ensure dummy data is always present (add missing entries)
    const dummyIds = ['TB-DEP-001', 'OR-ISS-001', 'OE-DEP-002', 'TB-BUS-001', 'TB-EDU-001', 'OE-NUR-001', 'OR-ENG-001', 'TB-CS-002', 'OE-BUS-002', 'TB-ENG-002'];
    const currentRefs = getReferences(true);
    const existingIds = new Set(currentRefs.map(r => r.id));
    const missingDummies = dummyIds.filter(id => !existingIds.has(id));

    if (missingDummies.length > 0) {
      const allDummyRefs = [
        { id: 'TB-DEP-001', numericId: 9991, title: 'Introduction to Algorithms (3rd Edition)', authors: 'Cormen, T., Leiserson, C., Rivest, R., Stein, C.', type: 'Textbook', year: 2009, isbn: '978-0-262-03384-8', link: '', publisher: 'MIT Press', filename: '', uploadDate: '2015-06-01', hasIssue: false, archived: false, departments: ['School of Computing and Information Sciences'], programs: ['BS Computer Science', 'BS Information Technology'], usedInCourses: ['BSCS331L', 'BSCS411L', 'BSIT312'] },
        { id: 'OR-ISS-001', numericId: 9992, title: 'Legacy Software Architecture Patterns', authors: 'Garcia, M.', type: 'Online Resources', year: 2014, isbn: '', link: 'https://example.com/legacy-arch', publisher: '', filename: '', uploadDate: '2016-03-15', hasIssue: true, archived: false, departments: ['School of Computing and Information Sciences'], programs: ['BS Information Technology'], usedInCourses: ['BSIT312'] },
        { id: 'OE-DEP-002', numericId: 9993, title: 'Foundations of Computer Science (Outdated Edition)', authors: 'Aho, A., Ullman, J.', type: 'Open Educational Resources', year: 2010, isbn: '', link: 'https://example.com/old-cs-foundations', publisher: 'Stanford Open Library', filename: '', uploadDate: '2012-11-20', hasIssue: false, archived: false, departments: ['General Education Department'], programs: ['General Education'], usedInCourses: ['GE101'] },
        { id: 'TB-BUS-001', numericId: 9994, title: 'Principles of Marketing', authors: 'Kotler, P., Armstrong, G.', type: 'Textbook', year: 2021, isbn: '978-0-13-384163-0', link: '', publisher: 'Pearson', filename: '', uploadDate: '2022-01-15', hasIssue: false, archived: false, departments: ['College of Business and Accountancy'], programs: ['BS Business Administration', 'BS Accountancy'], usedInCourses: ['BSBA101', 'BSA201'] },
        { id: 'TB-EDU-001', numericId: 9995, title: 'Educational Psychology: Theory and Practice', authors: 'Slavin, R.E.', type: 'Textbook', year: 2020, isbn: '978-0-13-499409-4', link: '', publisher: 'Pearson', filename: '', uploadDate: '2021-06-10', hasIssue: false, archived: false, departments: ['College of Education and Arts & Sciences'], programs: ['BS Education', 'BS Psychology'], usedInCourses: ['BSE201', 'BSPsych101'] },
        { id: 'OE-NUR-001', numericId: 9996, title: 'Fundamentals of Nursing', authors: 'Potter, P.A., Perry, A.G.', type: 'Open Educational Resources', year: 2022, isbn: '978-0-323-59620-8', link: 'https://example.com/nursing-fundamentals', publisher: 'Elsevier', filename: '', uploadDate: '2023-02-20', hasIssue: false, archived: false, departments: ['College of Nursing and Allied Health Sciences'], programs: ['BS Nursing', 'BS Medical Technology'], usedInCourses: ['BSN101', 'BSMT201'] },
        { id: 'OR-ENG-001', numericId: 9997, title: 'Structural Analysis and Design', authors: 'Hibbeler, R.C.', type: 'Online Resources', year: 2019, isbn: '', link: 'https://example.com/structural-analysis', publisher: 'McGraw-Hill', filename: '', uploadDate: '2020-08-15', hasIssue: false, archived: false, departments: ['College of Engineering and Architecture'], programs: ['BS Civil Engineering', 'BS Architecture'], usedInCourses: ['BSCIE301', 'BSARCH201'] },
        { id: 'TB-CS-002', numericId: 9998, title: 'Database Management Systems', authors: 'Ramakrishnan, R., Gehrke, J.', type: 'Textbook', year: 2023, isbn: '978-0-07-246563-1', link: '', publisher: 'McGraw-Hill', filename: '', uploadDate: '2024-01-10', hasIssue: false, archived: false, departments: ['School of Computing and Information Sciences'], programs: ['BS Computer Science', 'BS Information Technology', 'BS Computer Engineering'], usedInCourses: ['BSCS301L', 'BSIT213L', 'BSCpE301'] },
        { id: 'OE-BUS-002', numericId: 9999, title: 'Financial Accounting and Reporting', authors: 'Valix, P., Valix, C.', type: 'Open Educational Resources', year: 2022, isbn: '', link: 'https://example.com/financial-accounting', publisher: 'GIC Enterprises', filename: '', uploadDate: '2023-07-01', hasIssue: false, archived: false, departments: ['College of Business and Accountancy'], programs: ['BS Accountancy', 'BS Management Accounting'], usedInCourses: ['BSA301', 'BSMA201'] },
        { id: 'TB-ENG-002', numericId: 10000, title: 'Electrical Circuits and Electronics', authors: 'Boylestad, R.L.', type: 'Textbook', year: 2020, isbn: '978-0-13-487444-4', link: '', publisher: 'Pearson', filename: '', uploadDate: '2021-09-15', hasIssue: false, archived: false, departments: ['College of Engineering and Architecture'], programs: ['BS Electrical Engineering', 'BS Electronics Engineering'], usedInCourses: ['BSEE201', 'BSECE301'] },
      ];

      missingDummies.forEach(id => {
        const dummy = allDummyRefs.find(r => r.id === id);
        if (dummy) addReference(dummy);
      });

      const updated = getReferences(true);
      setReferences(updated);
      setReferencesState(updated);
    }

    if (existing.length === 0) {
      const seeded = [];
      let numericId = 0;
      const seenIds = new Set();
      const courseRefMap = {};

      syllabiData.forEach(s => {
        const prefix = extractProgramPrefix(s.code);
        const program = getProgramName(prefix);
        const department = getDepartmentName(prefix);

        if (s.references && Array.isArray(s.references)) {
          s.references.forEach(ref => {
            if (!seenIds.has(ref.id)) {
              seenIds.add(ref.id);
              numericId++;
              const refData = {
                id: ref.id,
                numericId,
                title: ref.title,
                authors: ref.authors,
                type: ref.type,
                year: ref.year || '',
                isbn: ref.isbn || '',
                link: ref.link || '',
                publisher: ref.publisher || '',
                filename: ref.filename || '',
                uploadDate: new Date().toISOString().split('T')[0],
                hasIssue: false,
                archived: false,
                departments: [department],
                programs: [program],
                usedInCourses: [s.code],
              };
              seeded.push(refData);
              courseRefMap[ref.id] = refData;
            } else {
              const existingRef = courseRefMap[ref.id];
              if (existingRef) {
                if (!existingRef.departments.includes(department)) existingRef.departments.push(department);
                if (!existingRef.programs.includes(program)) existingRef.programs.push(program);
                if (!existingRef.usedInCourses.includes(s.code)) existingRef.usedInCourses.push(s.code);
              }
            }
          });
        }
      });

      setReferences(seeded);
      setReferencesState(seeded);

      // Add sample deprecated & issue references
      const sampleRefs = getReferences(true);
      const extraRefs = [
        {
          id: 'TB-DEP-001',
          numericId: 9991,
          title: 'Introduction to Algorithms (3rd Edition)',
          authors: 'Cormen, T., Leiserson, C., Rivest, R., Stein, C.',
          type: 'Textbook',
          year: 2009,
          isbn: '978-0-262-03384-8',
          link: '',
          publisher: 'MIT Press',
          filename: '',
          uploadDate: '2015-06-01',
          hasIssue: false,
          archived: false,
          departments: ['School of Computing and Information Sciences'],
          programs: ['BS Computer Science', 'BS Information Technology'],
          usedInCourses: ['BSCS331L', 'BSCS411L', 'BSIT312'],
        },
        {
          id: 'OR-ISS-001',
          numericId: 9992,
          title: 'Legacy Software Architecture Patterns',
          authors: 'Garcia, M.',
          type: 'Online Resources',
          year: 2014,
          isbn: '',
          link: 'https://example.com/legacy-arch',
          publisher: '',
          filename: '',
          uploadDate: '2016-03-15',
          hasIssue: true,
          archived: false,
          departments: ['School of Computing and Information Sciences'],
          programs: ['BS Information Technology'],
          usedInCourses: ['BSIT312'],
        },
        {
          id: 'OE-DEP-002',
          numericId: 9993,
          title: 'Foundations of Computer Science (Outdated Edition)',
          authors: 'Aho, A., Ullman, J.',
          type: 'Open Educational Resources',
          year: 2010,
          isbn: '',
          link: 'https://example.com/old-cs-foundations',
          publisher: 'Stanford Open Library',
          filename: '',
          uploadDate: '2012-11-20',
          hasIssue: false,
          archived: false,
          departments: ['General Education Department'],
          programs: ['General Education'],
          usedInCourses: ['GE101'],
        },
        {
          id: 'TB-BUS-001',
          numericId: 9994,
          title: 'Principles of Marketing',
          authors: 'Kotler, P., Armstrong, G.',
          type: 'Textbook',
          year: 2021,
          isbn: '978-0-13-384163-0',
          link: '',
          publisher: 'Pearson',
          filename: '',
          uploadDate: '2022-01-15',
          hasIssue: false,
          archived: false,
          departments: ['College of Business and Accountancy'],
          programs: ['BS Business Administration', 'BS Accountancy'],
          usedInCourses: ['BSBA101', 'BSA201'],
        },
        {
          id: 'TB-EDU-001',
          numericId: 9995,
          title: 'Educational Psychology: Theory and Practice',
          authors: 'Slavin, R.E.',
          type: 'Textbook',
          year: 2020,
          isbn: '978-0-13-499409-4',
          link: '',
          publisher: 'Pearson',
          filename: '',
          uploadDate: '2021-06-10',
          hasIssue: false,
          archived: false,
          departments: ['College of Education and Arts & Sciences'],
          programs: ['BS Education', 'BS Psychology'],
          usedInCourses: ['BSE201', 'BSPsych101'],
        },
        {
          id: 'OE-NUR-001',
          numericId: 9996,
          title: 'Fundamentals of Nursing',
          authors: 'Potter, P.A., Perry, A.G.',
          type: 'Open Educational Resources',
          year: 2022,
          isbn: '978-0-323-59620-8',
          link: 'https://example.com/nursing-fundamentals',
          publisher: 'Elsevier',
          filename: '',
          uploadDate: '2023-02-20',
          hasIssue: false,
          archived: false,
          departments: ['College of Nursing and Allied Health Sciences'],
          programs: ['BS Nursing', 'BS Medical Technology'],
          usedInCourses: ['BSN101', 'BSMT201'],
        },
        {
          id: 'OR-ENG-001',
          numericId: 9997,
          title: 'Structural Analysis and Design',
          authors: 'Hibbeler, R.C.',
          type: 'Online Resources',
          year: 2019,
          isbn: '',
          link: 'https://example.com/structural-analysis',
          publisher: 'McGraw-Hill',
          filename: '',
          uploadDate: '2020-08-15',
          hasIssue: false,
          archived: false,
          departments: ['College of Engineering and Architecture'],
          programs: ['BS Civil Engineering', 'BS Architecture'],
          usedInCourses: ['BSCIE301', 'BSARCH201'],
        },
        {
          id: 'TB-CS-002',
          numericId: 9998,
          title: 'Database Management Systems',
          authors: 'Ramakrishnan, R., Gehrke, J.',
          type: 'Textbook',
          year: 2023,
          isbn: '978-0-07-246563-1',
          link: '',
          publisher: 'McGraw-Hill',
          filename: '',
          uploadDate: '2024-01-10',
          hasIssue: false,
          archived: false,
          departments: ['School of Computing and Information Sciences'],
          programs: ['BS Computer Science', 'BS Information Technology', 'BS Computer Engineering'],
          usedInCourses: ['BSCS301L', 'BSIT213L', 'BSCpE301'],
        },
        {
          id: 'OE-BUS-002',
          numericId: 9999,
          title: 'Financial Accounting and Reporting',
          authors: 'Valix, P., Valix, C.',
          type: 'Open Educational Resources',
          year: 2022,
          isbn: '',
          link: 'https://example.com/financial-accounting',
          publisher: 'GIC Enterprises',
          filename: '',
          uploadDate: '2023-07-01',
          hasIssue: false,
          archived: false,
          departments: ['College of Business and Accountancy'],
          programs: ['BS Accountancy', 'BS Management Accounting'],
          usedInCourses: ['BSA301', 'BSMA201'],
        },
        {
          id: 'TB-ENG-002',
          numericId: 10000,
          title: 'Electrical Circuits and Electronics',
          authors: 'Boylestad, R.L.',
          type: 'Textbook',
          year: 2020,
          isbn: '978-0-13-487444-4',
          link: '',
          publisher: 'Pearson',
          filename: '',
          uploadDate: '2021-09-15',
          hasIssue: false,
          archived: false,
          departments: ['College of Engineering and Architecture'],
          programs: ['BS Electrical Engineering', 'BS Electronics Engineering'],
          usedInCourses: ['BSEE201', 'BSECE301'],
        },
      ];
      extraRefs.forEach(r => addReference(r));
      setReferencesState(getReferences(true));
    }
  }, []);

  /* ── Sync when references change ─────────────────────────────────── */
  const syncReferences = (newRefs) => {
    setReferences(newRefs);
    setReferencesState(getReferences(true));
  };

  /* ── Bulk Upload ─────────────────────────────────────────────────── */
  const handleBulkUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        let added = 0;
        let skipped = 0;
        const existingIds = new Set(getReferences(true).map(r => r.id));

        rows.forEach((row) => {
          const title = (row['Title'] || row['title'] || '').toString().trim();
          const authors = (row['Author(s)'] || row['Authors'] || row['author'] || row['authors'] || '').toString().trim();
          const type = (row['Reference Type'] || row['Type'] || row['type'] || '').toString().trim();
          const year = row['Year'] || row['year'] || '';
          const isbn = (row['ISBN'] || row['isbn'] || '').toString().trim();
          const link = (row['Link'] || row['link'] || row['URL'] || row['url'] || '').toString().trim();
          const department = (row['Department'] || row['department'] || '').toString().trim();
          const program = (row['Program'] || row['program'] || '').toString().trim();
          const courseCode = (row['Course Code'] || row['courseCode'] || row['Course'] || row['course'] || '').toString().trim();

          if (!title || !type) {
            skipped++;
            return;
          }

          const refId = `${type === 'Textbook' ? 'TB' : type === 'Open Educational Resources' ? 'OE' : 'OR'}${Date.now()}-${added}`;
          if (existingIds.has(refId)) {
            skipped++;
            return;
          }

          addReference({
            id: refId,
            title,
            authors,
            type,
            year: year ? parseInt(year) : '',
            isbn,
            link,
            publisher: '',
            filename: '',
            uploadDate: new Date().toISOString().split('T')[0],
            hasIssue: false,
            archived: false,
            departments: department ? [department] : [],
            programs: program ? [program] : [],
            usedInCourses: courseCode ? [courseCode] : [],
          });

          existingIds.add(refId);
          added++;
        });

        const updated = getReferences(true);
        syncReferences(updated);
        setBulkResult({ added, skipped, total: rows.length });
        setShowBulkModal(true);
      } catch (err) {
        console.error('Bulk upload failed:', err);
        alert('Failed to parse the Excel file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  /* ── Modal states ───────────────────────────────────────────────────── */
  const [viewRef, setViewRef] = useState(null);
  const [archiveRef, setArchiveRef] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [viewComments, setViewComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef(null);

  /* ── Load comments when viewRef changes ────────────────────────────── */
  useEffect(() => {
    if (viewRef) {
      setViewComments(getReferenceComments(viewRef.id));
      setCommentText('');
    }
  }, [viewRef]);

  /* ── Stats ─────────────────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = activeRefs.length;
    const textbooks = activeRefs.filter((r) => r.type === 'Textbook').length;
    const oer = activeRefs.filter((r) => r.type === 'Open Educational Resources').length;
    const online = activeRefs.filter((r) => r.type === 'Online Resources').length;
    const deprecated = activeRefs.filter(isDeprecated).length;
    const issues = activeRefs.filter(hasIssues).length;
    return { total, textbooks, oer, online, deprecated, issues };
  }, [activeRefs]);

  /* ── Filter ────────────────────────────────────────────────────────── */
  const sourceRefs = tab === 'archived' ? archivedRefs : activeRefs;

  const allDepartments = useMemo(() => {
    const deps = new Set();
    activeRefs.forEach(r => (r.departments || []).forEach(d => deps.add(d)));
    return Array.from(deps).sort();
  }, [activeRefs]);

  const filtered = useMemo(() => {
    let result = sourceRefs;
    if (filterType) {
      result = result.filter((r) => r.type === filterType);
    }
    if (filterDepartment) {
      result = result.filter((r) => (r.departments || []).includes(filterDepartment));
    }
    return result;
  }, [sourceRefs, filterType, filterDepartment]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const confirmArchive = () => {
    if (archiveRef) {
      archiveReference(archiveRef.id);
      setReferencesState(getReferences(true));
      setArchiveRef(null);
    }
  };

  const confirmUnarchive = (id) => {
    unarchiveReference(id);
    setReferencesState(getReferences(true));
  };

  const getTypeBadgeClass = (type) => {
    switch (type) {
      case 'Textbook': return styles.typeBadgeBook;
      case 'Open Educational Resources': return styles.typeBadgeJournal;
      case 'Online Resources': return styles.typeBadgeArticle;
      default: return styles.typeBadgeBook;
    }
  };

  /* ── Content ───────────────────────────────────────────────────────── */
  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>REFERENCE LIBRARY</h1>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}><BookOpen size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total References</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}><BookOpen size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.textbooks}</div>
            <div className={styles.statLabel}>Textbooks</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconTeal}`}><FileText size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.oer}</div>
            <div className={styles.statLabel}>Open Educational Resources</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconPurple}`}><Globe size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.online}</div>
            <div className={styles.statLabel}>Online Resources</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconYellow}`}><AlertTriangle size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.deprecated}</div>
            <div className={styles.statLabel}>Deprecated (5+ yrs)</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconRed}`}><AlertCircle size={20} /></div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.issues}</div>
            <div className={styles.statLabel}>With Issues</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controlsBar}>
        <div className={'filter-container'}>
          <p>Filter by <strong>Department</strong>:</p>
          <select value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); }}>
            <option value="">All Departments</option>
            {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className={'filter-container'}>
          <p>Filter by <strong>Type</strong>:</p>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Textbook">Textbook</option>
            <option value="Open Educational Resources">Open Educational Resources</option>
            <option value="Online Resources">Online Resources</option>
          </select>
        </div>
        <button className={styles.addBtn} type="button" onClick={() => navigate('/role/director-of-libraries/add-reference')}>
          <Plus size={16} /><span>Add Reference</span>
        </button>
        <button className={styles.bulkBtn} type="button" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} /><span>Bulk Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleBulkUpload}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <button onClick={() => setTab('active')} style={{ padding: '10px 0', fontSize: 14, fontWeight: 600, fontFamily: "'Poppins', sans-serif", background: 'none', border: 'none', color: tab === 'active' ? '#1e3a5f' : '#6b7280', cursor: 'pointer' }}>
          Active References ({activeRefs.length})
        </button>
        <button onClick={() => setTab('archived')} style={{ padding: '10px 0', fontSize: 14, fontWeight: 600, fontFamily: "'Poppins', sans-serif", background: 'none', border: 'none', color: tab === 'archived' ? '#dc2626' : '#6b7280', cursor: 'pointer' }}>
          Archived ({archivedRefs.length})
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th width={80}>ID</th>
              <th width={340}>TITLE</th>
              <th width={200}>AUTHOR(S)</th>
              <th width={200}>TYPE</th>
              <th width={80}>YEAR</th>
              <th width={150}>STATUS</th>
              <th className="fill"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((ref) => (
                <tr key={ref.id}>
                  <td width={80}>{ref.id}</td>
                  <td width={340}>
                    <div className={styles.titleCell}>
                      <span className={styles.refTitle}>{ref.title}</span>
                      {ref.filename && <span className={styles.refFilename}>{ref.filename}</span>}
                    </div>
                  </td>
                  <td width={200}>{ref.authors}</td>
                  <td width={200}><span className={`${styles.typeBadge} ${getTypeBadgeClass(ref.type)}`}>{ref.type}</span></td>
                  <td width={80}>{ref.year || '—'}</td>
                  <td width={150}>
                    {isDeprecated(ref) && <span className={styles.deprecatedBadge}>Deprecated</span>}
                    {hasIssues(ref) && <span className={styles.issueBadge}>Has Issue</span>}
                    {!isDeprecated(ref) && !hasIssues(ref) && <span className={styles.goodBadge}>Active</span>}
                  </td>
                  <td className="fill">
                    <div className={styles.actionGroup}>
                      <button className={styles.actionView} type="button" onClick={() => setViewRef(ref)}>View</button>
                      <span className={styles.actionDot}>·</span>
                      <button className={styles.actionEdit} type="button" onClick={() => navigate(`/role/director-of-libraries/edit-reference/${ref.id}`)}>Edit</button>
                      {tab === 'archived' ? (
                        <>
                          <span className={styles.actionDot}>·</span>
                          <button className={styles.actionEdit} type="button" onClick={() => confirmUnarchive(ref.id)} style={{ color: '#047857' }}>Unarchive</button>
                        </>
                      ) : (
                        <>
                          <span className={styles.actionDot}>·</span>
                          <button className={styles.actionDelete} type="button" onClick={() => setArchiveRef(ref)}>Archive</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className={styles.noData}>No {tab === 'archived' ? 'archived' : ''} references found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── VIEW MODAL ──────────────────────────────────────────────────── */}
      {viewRef && (
        <div className={styles.modalOverlay} onClick={() => setViewRef(null)}>
          <div className={styles.viewModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>REFERENCE DETAILS</h2>
              <button className={styles.modalClose} onClick={() => setViewRef(null)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              {isDeprecated(viewRef) && (
                <div className={styles.warningBanner}>
                  <AlertTriangle size={16} /> This reference is over 5 years old and may be outdated.
                </div>
              )}
              {hasIssues(viewRef) && (
                <div className={styles.errorBanner}>
                  <AlertCircle size={16} /> This reference has a reported issue and instructors cannot use it.
                </div>
              )}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Basic Information</h3>
                <div className={styles.modalRow}><span className={styles.modalLabel}>REFERENCE ID</span><span className={styles.modalValue}>{viewRef.id}</span></div>
                <div className={styles.modalRow}><span className={styles.modalLabel}>TITLE</span><span className={styles.modalValue}>{viewRef.title}</span></div>
                <div className={styles.modalRow}><span className={styles.modalLabel}>AUTHOR(S)</span><span className={styles.modalValue}>{viewRef.authors}</span></div>
                <div className={styles.modalRow2col}>
                  <div><span className={styles.modalLabel}>TYPE</span><span className={styles.modalValue}>{viewRef.type || '—'}</span></div>
                  <div><span className={styles.modalLabel}>YEAR</span><span className={styles.modalValue}>{viewRef.year || '—'}</span></div>
                </div>
                {viewRef.isbn && <div className={styles.modalRow}><span className={styles.modalLabel}>ISBN</span><span className={styles.modalValue}>{viewRef.isbn}</span></div>}
                {viewRef.link && <div className={styles.modalRow}><span className={styles.modalLabel}>LINK</span><a href={viewRef.link} target="_blank" rel="noopener noreferrer" className={styles.modalLink}>{viewRef.link}</a></div>}
                {viewRef.publisher && <div className={styles.modalRow}><span className={styles.modalLabel}>PUBLISHER</span><span className={styles.modalValue}>{viewRef.publisher}</span></div>}
                {viewRef.filename && <div className={styles.modalRow}><span className={styles.modalLabel}>FILE</span><span className={styles.modalValue}>{viewRef.filename}</span></div>}
              </div>

              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Department</h3>
                {(viewRef.departments || []).length > 0 ? (
                  <div className={styles.modalRow}>
                    <span className={styles.modalLabel}>DEPARTMENT</span>
                    <span className={styles.modalValue} style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 6 }}>
                      {(viewRef.departments || []).map((d, i) => (
                        <span key={i} className={styles.deptBadge} style={{ backgroundColor: getDeptColor(d) + '1a', color: getDeptColor(d), borderLeft: `3px solid ${getDeptColor(d)}`, whiteSpace: 'nowrap' }}>
                          <span className={styles.deptBadgeShort}>{getDeptShort(d)}</span>
                          <span className={styles.deptBadgeFull}>{d}</span>
                        </span>
                      ))}
                    </span>
                  </div>
                ) : (
                  <div className={styles.modalRow}><span className={styles.modalLabel}>DEPARTMENT</span><span className={styles.modalValue} style={{ color: '#9ca3af', fontStyle: 'italic' }}>Not assigned</span></div>
                )}
              </div>

              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Metadata</h3>
                <div className={styles.modalRow}><span className={styles.modalLabel}>UPLOAD DATE</span><span className={styles.modalValue}>{viewRef.uploadDate ? new Date(viewRef.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span></div>
                <div className={styles.issueToggleRow}>
                  <label className={styles.issueToggleLabel}>
                    <input type="checkbox" checked={viewRef.hasIssue || false} onChange={() => {
                      const updated = updateReference(viewRef.id, { hasIssue: !viewRef.hasIssue });
                      if (updated) {
                        const newRefs = getReferences(true);
                        syncReferences(newRefs);
                        setViewRef(prev => ({ ...prev, hasIssue: !prev.hasIssue }));
                      }
                    }} />
                    <span>Mark as having an issue (instructors cannot use this reference)</span>
                  </label>
                </div>
              </div>

              <div className={styles.commentSection}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600, color: '#374151' }}>Comments</h4>
                {viewComments.length === 0 ? (
                  <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#9ca3af' }}>No comments yet.</p>
                ) : (
                  <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {viewComments.map(c => (
                      <div key={c.id} style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 13, color: '#111827', marginBottom: 4 }}>{c.text}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{c.author} &middot; {new Date(c.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: "'Poppins', sans-serif", outline: 'none' }} />
                  <button onClick={() => {
                    if (!commentText.trim()) return;
                    addReferenceComment(viewRef.id, commentText.trim(), getRoleName('director-of-libraries'));
                    setViewComments(getReferenceComments(viewRef.id));
                    setCommentText('');
                  }} style={{ padding: '10px 20px', background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>Post</button>
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnEdit} onClick={() => { setViewRef(null); navigate(`/role/director-of-libraries/edit-reference/${viewRef.id}`); }}>Edit Reference</button>
              <button className={styles.modalBtnClose} onClick={() => setViewRef(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ARCHIVE CONFIRMATION MODAL ──────────────────────────────────── */}
      {archiveRef && (
        <div className={styles.modalOverlay} onClick={() => setArchiveRef(null)}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 4H3" /><path d="M8 2v2" /><path d="M16 2v2" /><rect x="5" y="6" width="14" height="16" rx="2" /><line x1="10" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <h3 className={styles.deleteTitle}>Archive Reference</h3>
            <p className={styles.deleteText}>Are you sure you want to archive <strong>"{archiveRef.title}"</strong>? Archived references will only be visible to the Director of Libraries.</p>
            <div className={styles.deleteActions}>
              <button className={styles.deleteBtnCancel} onClick={() => setArchiveRef(null)}>Cancel</button>
              <button className={styles.deleteBtnConfirm} onClick={confirmArchive} style={{ background: '#b45309' }}>Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* ── BULK UPLOAD RESULT MODAL ────────────────────────────────────── */}
      {showBulkModal && bulkResult && (
        <div className={styles.modalOverlay} onClick={() => { setShowBulkModal(false); setBulkResult(null); }}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Bulk Upload Result</h2>
              <button className={styles.modalClose} onClick={() => { setShowBulkModal(false); setBulkResult(null); }}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="16 8 10 16 7 13" />
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#047857' }}>{bulkResult.added}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Added</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#b45309' }}>{bulkResult.skipped}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Skipped</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#000' }}>{bulkResult.total}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Total Rows</div>
                </div>
              </div>
              <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: 0 }}>
                Expected columns: <strong>Title</strong>, <strong>Author(s)</strong>, <strong>Reference Type</strong>, <strong>Year</strong>, <strong>ISBN</strong>, <strong>Link</strong>
              </p>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnClose} onClick={() => { setShowBulkModal(false); setBulkResult(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role="Director of Libraries" name="SANTOS, MARIA" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={content}
    />
  );
};

export default ReferenceLibrary;
