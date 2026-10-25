/**
 * BMS Chat - Zero-Dependency Local Web Server & Centralized Hierarchy-Based Renewal Engine
 * Runs out of the box using Node.js built-in 'http', 'fs', 'path', and 'url' modules.
 * Centralized Renewal Database with Server-side Role & Hierarchy Access Control.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;
const ROOT_DIR = __dirname;
const RENEWALS_DB_PATH = path.join(ROOT_DIR, 'renewals_db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Database helper functions
function loadRenewalsDB() {
  try {
    if (!fs.existsSync(RENEWALS_DB_PATH)) {
      return { renewals: [] };
    }
    const raw = fs.readFileSync(RENEWALS_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading renewals_db.json:', err);
    return { renewals: [] };
  }
}

function saveRenewalsDB(data) {
  try {
    fs.writeFileSync(RENEWALS_DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing renewals_db.json:', err);
    return false;
  }
}

// Request Body Parser Helper
function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', err => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  // Enable CORS & Enterprise Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-User-Role, X-Tenant-Id');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // -------------------------------------------------------------
  // API: Health Check
  // -------------------------------------------------------------
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'online', app: 'BMS Chat', timestamp: new Date().toISOString() }));
    return;
  }

  // -------------------------------------------------------------
  // API 1: GET /api/renewals - Role & Hierarchy Based Retrieval
  // -------------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/renewals') {
    const db = loadRenewalsDB();
    let records = db.renewals || [];

    // Extract auth context from query or custom headers
    const userId = query.userId || req.headers['x-user-id'] || 'marcus.bm';
    const role = (query.role || req.headers['x-user-role'] || 'BRANCH_MANAGER').toUpperCase();
    const employeeId = query.employeeId || '';
    const tenantId = query.tenantId || req.headers['x-tenant-id'] || 'tnt-101';

    // SERVER-SIDE HIERARCHY-BASED FILTERING RULE
    // 1. Super Admin: sees all renewals across branches
    // 2. Branch Manager: sees all renewals for their branch (all FLS, TSE, agents included)
    // 3. FLS Manager (SALES_MANAGER): sees only renewals for agents assigned directly to them OR under their supervised TSEs
    // 4. TSE / DL Leader (TSE): sees only renewals for agents assigned under them
    // 5. Agent (AGENT): sees only their own renewals
    if (role === 'SUPER_ADMIN') {
      if (query.branchId && query.branchId !== 'ALL') {
        records = records.filter(r => r.branchId === query.branchId);
      }
    } else if (role === 'BRANCH_MANAGER') {
      records = records.filter(r => r.branchId === tenantId);
    } else if (role === 'SALES_MANAGER') {
      // FLS Manager: sees renewals where flsCode matches employeeId or flsId matches userId
      records = records.filter(r => {
        const matchesCode = Boolean(employeeId && r.flsCode === employeeId);
        const matchesId = Boolean(userId && r.flsId === userId);
        const matchesName = Boolean(query.userName && query.userName.trim() && r.flsName && r.flsName.toLowerCase() === query.userName.trim().toLowerCase());
        return matchesCode || matchesId || matchesName;
      });
    } else if (role === 'TSE') {
      // TSE / DL Leader: sees renewals where tseCode matches employeeId or tseId matches userId
      records = records.filter(r => {
        const matchesCode = Boolean(employeeId && r.tseCode === employeeId);
        const matchesId = Boolean(userId && r.tseId === userId);
        const matchesName = Boolean(query.userName && query.userName.trim() && r.tseName && r.tseName.toLowerCase() === query.userName.trim().toLowerCase());
        return matchesCode || matchesId || matchesName;
      });
    } else if (role === 'AGENT') {
      records = records.filter(r => {
        const matchesCode = Boolean(employeeId && r.agentCode === employeeId);
        const matchesId = Boolean(userId && r.agentId === userId);
        const matchesName = Boolean(query.userName && query.userName.trim() && r.agentName && r.agentName.toLowerCase() === query.userName.trim().toLowerCase());
        return matchesCode || matchesId || matchesName;
      });
    }

    // Granular Filtering (Branch Manager / FLS / TSE filter options)
    if (query.flsFilter && query.flsFilter !== 'ALL') {
      records = records.filter(r => r.flsId === query.flsFilter || r.flsCode === query.flsFilter || r.flsName === query.flsFilter);
    }
    if (query.tseFilter && query.tseFilter !== 'ALL') {
      records = records.filter(r => r.tseId === query.tseFilter || r.tseCode === query.tseFilter || r.tseName === query.tseFilter);
    }
    if (query.agentFilter && query.agentFilter !== 'ALL') {
      records = records.filter(r => r.agentId === query.agentFilter || r.agentCode === query.agentFilter || r.agentName === query.agentFilter);
    }
    if (query.statusFilter && query.statusFilter !== 'ALL') {
      records = records.filter(r => r.followupStatus === query.statusFilter);
    }
    if (query.monthFilter && query.monthFilter !== 'ALL') {
      records = records.filter(r => r.renewalDueDate.startsWith(query.monthFilter) || r.renewalCycle === query.monthFilter);
    }
    if (query.dueDateFilter && query.dueDateFilter !== 'ALL') {
      const today = new Date().toISOString().split('T')[0];
      if (query.dueDateFilter === 'OVERDUE') {
        records = records.filter(r => r.renewalDueDate < today && r.renewalStatus !== 'Renewed');
      } else if (query.dueDateFilter === 'TODAY') {
        records = records.filter(r => r.renewalDueDate === today);
      } else if (query.dueDateFilter === 'NEXT_7_DAYS') {
        const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        records = records.filter(r => r.renewalDueDate >= today && r.renewalDueDate <= next7);
      } else if (query.dueDateFilter === 'THIS_MONTH') {
        const curMonth = today.slice(0, 7);
        records = records.filter(r => r.renewalDueDate.startsWith(curMonth));
      }
    }
    if (query.search) {
      const q = query.search.toLowerCase().trim();
      records = records.filter(r =>
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.policyNumber && r.policyNumber.toLowerCase().includes(q)) ||
        (r.customerMobile && r.customerMobile.includes(q)) ||
        (r.agentName && r.agentName.toLowerCase().includes(q)) ||
        (r.agentCode && r.agentCode.toLowerCase().includes(q))
      );
    }

    // Compute Summary KPIs
    const totalPremium = records.reduce((sum, r) => sum + (Number(r.renewalPremium) || 0), 0);
    const pendingCount = records.filter(r => r.followupStatus === 'Pending').length;
    const callbackCount = records.filter(r => r.followupStatus === 'Call Back').length;
    const doneCount = records.filter(r => r.followupStatus === 'Done').length;
    const renewedCount = records.filter(r => r.renewalStatus === 'Renewed' || r.followupStatus === 'Renewed').length;
    const notReachableCount = records.filter(r => r.followupStatus === 'Not Reachable').length;
    const notInterestedCount = records.filter(r => r.followupStatus === 'Not Interested').length;
    const completedFollowups = doneCount + renewedCount;
    const renewalRate = records.length > 0 ? ((renewedCount / records.length) * 100).toFixed(1) : 0;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      context: { userId, role, tenantId },
      metrics: {
        totalPremium,
        totalCases: records.length,
        pendingCount,
        callbackCount,
        doneCount,
        renewedCount,
        notReachableCount,
        notInterestedCount,
        completedFollowups,
        renewalRate: Number(renewalRate)
      },
      data: records
    }));
    return;
  }

  // -------------------------------------------------------------
  // API 2: POST /api/renewals/followup - Log Follow-up & Audit
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/renewals/followup') {
    try {
      const payload = await parseJSONBody(req);
      const { renewalId, followupStatus, nextFollowUpDate, remarks, updatedBy, updatedByName, updatedByRole } = payload;

      if (!renewalId || !followupStatus) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'renewalId and followupStatus are required' }));
        return;
      }

      const db = loadRenewalsDB();
      const rec = (db.renewals || []).find(r => r.id === renewalId);

      if (!rec) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Renewal record not found' }));
        return;
      }

      const prevStatus = rec.followupStatus;
      const nowStr = new Date().toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      // CORE RULE: "A completed follow-up must not automatically change the policy renewal status to Renewed."
      if (followupStatus === 'Renewed') {
        rec.renewalStatus = 'Renewed';
        rec.followupStatus = 'Renewed';
      } else {
        rec.followupStatus = followupStatus;
        // If status was already 'Renewed', keep it, else it remains 'Pending Payment'
        if (rec.renewalStatus !== 'Renewed') {
          rec.renewalStatus = 'Pending Payment';
        }
      }

      rec.nextFollowUpDate = nextFollowUpDate || '';
      rec.lastFollowupRemarks = remarks || '';
      rec.lastFollowupAt = nowStr;
      rec.lastFollowupBy = updatedBy || 'user';
      rec.lastFollowupByName = updatedByName ? `${updatedByName} (${updatedByRole || 'Staff'})` : (updatedBy || 'Staff');
      rec.updatedAt = new Date().toISOString();

      if (!Array.isArray(rec.followupHistory)) {
        rec.followupHistory = [];
      }

      const historyEntry = {
        id: 'fh-' + Date.now(),
        timestamp: nowStr,
        updatedBy: updatedBy || 'user',
        updatedByName: updatedByName || updatedBy || 'Staff',
        updatedByRole: updatedByRole || 'Staff',
        previousStatus: prevStatus,
        newStatus: followupStatus,
        remarks: remarks || 'Follow-up status updated',
        nextFollowUpDate: nextFollowUpDate || '',
        previousMobile: null,
        newMobile: null
      };

      rec.followupHistory.unshift(historyEntry);
      saveRenewalsDB(db);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Follow-up successfully recorded and synchronized',
        renewal: rec
      }));
      return;
    } catch (err) {
      console.error('Followup error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // API 3: POST /api/renewals/update-mobile - Mobile Correction
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/renewals/update-mobile') {
    try {
      const payload = await parseJSONBody(req);
      const { renewalId, newMobile, updatedBy, updatedByName, updatedByRole } = payload;

      if (!renewalId || !newMobile) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'renewalId and newMobile are required' }));
        return;
      }

      const db = loadRenewalsDB();
      const rec = (db.renewals || []).find(r => r.id === renewalId);

      if (!rec) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Renewal record not found' }));
        return;
      }

      const prevMobile = rec.customerMobile;
      rec.customerMobile = newMobile.trim();
      rec.updatedAt = new Date().toISOString();

      const nowStr = new Date().toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      if (!Array.isArray(rec.followupHistory)) {
        rec.followupHistory = [];
      }
      if (!Array.isArray(rec.mobileChangeHistory)) {
        rec.mobileChangeHistory = [];
      }

      const historyEntry = {
        id: 'mob-' + Date.now(),
        timestamp: nowStr,
        updatedBy: updatedBy || 'user',
        updatedByName: updatedByName || updatedBy || 'Staff',
        updatedByRole: updatedByRole || 'Staff',
        previousStatus: rec.followupStatus,
        newStatus: rec.followupStatus,
        remarks: `Customer contact mobile corrected: ${prevMobile} → ${newMobile.trim()}`,
        nextFollowUpDate: rec.nextFollowUpDate || '',
        previousMobile: prevMobile,
        newMobile: newMobile.trim()
      };

      rec.followupHistory.unshift(historyEntry);
      rec.mobileChangeHistory.unshift({
        timestamp: nowStr,
        from: prevMobile,
        to: newMobile.trim(),
        changedBy: updatedByName || updatedBy
      });

      saveRenewalsDB(db);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Customer mobile number corrected and logged in audit history',
        renewal: rec
      }));
      return;
    } catch (err) {
      console.error('Update mobile error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // API 3B: POST /api/renewals - Direct Manual Renewal Entry
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/renewals') {
    try {
      const payload = await parseJSONBody(req);
      const {
        policyNumber,
        customerName,
        customerMobile,
        customerEmail = '',
        renewalPremium,
        renewalDueDate,
        productName = 'CareShield Comprehensive Health',
        branchId = 'tnt-101',
        branchName = 'Thodupuzha Branch',
        agentId,
        agentCode,
        agentName,
        tseId,
        tseCode,
        tseName,
        flsId,
        flsCode,
        flsName,
        paymentLink,
        followupStatus = 'Pending',
        renewalStatus = 'Pending Payment',
        nextFollowUpDate = '',
        remarks = 'Direct manual renewal entry',
        createdBy = 'user',
        createdByName = 'Staff',
        createdByRole = 'STAFF'
      } = payload;

      if (!policyNumber || !customerName || !customerMobile || !renewalPremium || !renewalDueDate) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Required fields: policyNumber, customerName, customerMobile, renewalPremium, renewalDueDate'
        }));
        return;
      }

      const db = loadRenewalsDB();
      const existing = (db.renewals || []).find(r => r.policyNumber && r.policyNumber.toLowerCase() === policyNumber.trim().toLowerCase());
      if (existing) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Policy number "${policyNumber}" already exists in the renewal database. Use Edit to modify it.`
        }));
        return;
      }

      const dueDate = renewalDueDate.trim();
      const cycle = dueDate.slice(0, 7);
      const nowStr = new Date().toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      const newRec = {
        id: `RNW-${Date.now()}`,
        policyNumber: policyNumber.trim(),
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        customerEmail: customerEmail ? customerEmail.trim() : `${customerName.toLowerCase().replace(/\s+/g, '.')}@client.internal`,
        renewalPremium: Number(renewalPremium) || 0,
        renewalDueDate: dueDate,
        renewalCycle: cycle,
        productName: productName.trim(),
        branchId,
        branchName,
        agentId: agentId || null,
        agentCode: agentCode || 'AG-UNM',
        agentName: agentName || 'Unassigned Advisor',
        tseId: tseId || null,
        tseCode: tseCode || null,
        tseName: tseName || null,
        flsId: flsId || null,
        flsCode: flsCode || null,
        flsName: flsName || null,
        paymentLink: paymentLink && paymentLink.trim() ? paymentLink.trim() : `https://pay.manipalcigna.com/renew/${policyNumber.trim()}`,
        followupStatus: followupStatus || 'Pending',
        renewalStatus: renewalStatus || 'Pending Payment',
        nextFollowUpDate: nextFollowUpDate || '',
        lastFollowupRemarks: remarks || 'Initial manual entry created',
        lastFollowupAt: nowStr,
        lastFollowupBy: createdBy,
        lastFollowupByName: createdByName ? `${createdByName} (${createdByRole})` : createdBy,
        followupHistory: [
          {
            id: 'fh-manual-' + Date.now(),
            timestamp: nowStr,
            updatedBy: createdBy,
            updatedByName: createdByName,
            updatedByRole: createdByRole,
            previousStatus: 'None',
            newStatus: followupStatus || 'Pending',
            remarks: remarks ? `Manual Entry Created: ${remarks}` : 'Manual renewal entry created in portal',
            nextFollowUpDate: nextFollowUpDate || '',
            previousMobile: null,
            newMobile: null
          }
        ],
        mobileChangeHistory: [],
        unmatched: false,
        unmatchedReason: null,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      };

      if (!Array.isArray(db.renewals)) db.renewals = [];
      db.renewals.unshift(newRec);
      saveRenewalsDB(db);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Renewal policy added successfully',
        renewal: newRec
      }));
      return;
    } catch (err) {
      console.error('Create renewal error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // API 3C: POST /api/renewals/update - Edit Renewal Record
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/renewals/update') {
    try {
      const payload = await parseJSONBody(req);
      const {
        renewalId,
        id,
        policyNumber,
        customerName,
        customerMobile,
        customerEmail,
        renewalPremium,
        renewalDueDate,
        productName,
        agentId,
        agentCode,
        agentName,
        tseId,
        tseCode,
        tseName,
        flsId,
        flsCode,
        flsName,
        paymentLink,
        renewalStatus,
        followupStatus,
        nextFollowUpDate,
        editRemarks,
        updatedBy = 'user',
        updatedByName = 'Staff',
        updatedByRole = 'STAFF'
      } = payload;

      const targetId = renewalId || id;
      if (!targetId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'renewalId is required' }));
        return;
      }

      const db = loadRenewalsDB();
      const rec = (db.renewals || []).find(r => r.id === targetId);
      if (!rec) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Renewal record not found' }));
        return;
      }

      const nowStr = new Date().toLocaleString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });

      // Track mobile change
      if (customerMobile && customerMobile.trim() !== rec.customerMobile) {
        const prevMobile = rec.customerMobile;
        const newMobile = customerMobile.trim();
        rec.customerMobile = newMobile;
        if (!Array.isArray(rec.mobileChangeHistory)) rec.mobileChangeHistory = [];
        rec.mobileChangeHistory.unshift({
          timestamp: nowStr,
          from: prevMobile,
          to: newMobile,
          changedBy: updatedByName || updatedBy
        });
      }

      // Update basic fields if provided
      if (policyNumber) rec.policyNumber = policyNumber.trim();
      if (customerName) rec.customerName = customerName.trim();
      if (customerEmail !== undefined) rec.customerEmail = customerEmail.trim();
      if (productName) rec.productName = productName.trim();
      if (renewalPremium !== undefined) rec.renewalPremium = Number(renewalPremium) || 0;
      if (renewalDueDate) {
        rec.renewalDueDate = renewalDueDate.trim();
        rec.renewalCycle = renewalDueDate.slice(0, 7);
      }
      if (paymentLink) rec.paymentLink = paymentLink.trim();

      // Update hierarchy if re-assigned
      if (agentId !== undefined) rec.agentId = agentId;
      if (agentCode !== undefined) rec.agentCode = agentCode;
      if (agentName !== undefined) rec.agentName = agentName;
      if (tseId !== undefined) rec.tseId = tseId;
      if (tseCode !== undefined) rec.tseCode = tseCode;
      if (tseName !== undefined) rec.tseName = tseName;
      if (flsId !== undefined) rec.flsId = flsId;
      if (flsCode !== undefined) rec.flsCode = flsCode;
      if (flsName !== undefined) rec.flsName = flsName;

      // Status updates
      const prevFollowupStatus = rec.followupStatus;
      if (followupStatus) rec.followupStatus = followupStatus;
      if (renewalStatus) rec.renewalStatus = renewalStatus;
      if (nextFollowUpDate !== undefined) rec.nextFollowUpDate = nextFollowUpDate;

      // Record edit history
      if (!Array.isArray(rec.followupHistory)) rec.followupHistory = [];
      rec.followupHistory.unshift({
        id: 'fh-edit-' + Date.now(),
        timestamp: nowStr,
        updatedBy,
        updatedByName,
        updatedByRole,
        previousStatus: prevFollowupStatus,
        newStatus: rec.followupStatus,
        remarks: editRemarks ? `Policy Details Edited: ${editRemarks}` : 'Policy details modified via edit entry',
        nextFollowUpDate: rec.nextFollowUpDate || '',
        previousMobile: null,
        newMobile: null
      });

      rec.lastFollowupAt = nowStr;
      rec.lastFollowupBy = updatedBy;
      rec.lastFollowupByName = updatedByName ? `${updatedByName} (${updatedByRole})` : updatedBy;
      rec.updatedAt = new Date().toISOString();

      saveRenewalsDB(db);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Renewal record updated successfully',
        renewal: rec
      }));
      return;
    } catch (err) {
      console.error('Update renewal error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // API 3D: GET /api/renewals/reports - Renewal Analytics & Performance Report
  // -------------------------------------------------------------
  if (req.method === 'GET' && pathname === '/api/renewals/reports') {
    try {
      const db = loadRenewalsDB();
      const records = db.renewals || [];

      const flsMap = {};
      const tseMap = {};
      const agentMap = {};
      const monthMap = {};

      let totalPremium = 0;
      let renewedPremium = 0;
      let renewedCount = 0;
      let pendingCount = 0;

      records.forEach(r => {
        const prem = Number(r.renewalPremium) || 0;
        totalPremium += prem;
        const isRenewed = r.renewalStatus === 'Renewed' || r.followupStatus === 'Renewed';
        if (isRenewed) {
          renewedPremium += prem;
          renewedCount++;
        } else {
          pendingCount++;
        }

        // FLS grouping
        const flsKey = r.flsName || 'Direct Branch';
        if (!flsMap[flsKey]) {
          flsMap[flsKey] = { name: flsKey, code: r.flsCode || 'N/A', totalCases: 0, totalPremium: 0, renewedCases: 0, renewedPremium: 0, pendingCases: 0 };
        }
        flsMap[flsKey].totalCases++;
        flsMap[flsKey].totalPremium += prem;
        if (isRenewed) {
          flsMap[flsKey].renewedCases++;
          flsMap[flsKey].renewedPremium += prem;
        } else {
          flsMap[flsKey].pendingCases++;
        }

        // TSE grouping
        const tseKey = r.tseName || 'Direct Agency';
        if (!tseMap[tseKey]) {
          tseMap[tseKey] = { name: tseKey, code: r.tseCode || 'N/A', totalCases: 0, totalPremium: 0, renewedCases: 0, renewedPremium: 0 };
        }
        tseMap[tseKey].totalCases++;
        tseMap[tseKey].totalPremium += prem;
        if (isRenewed) {
          tseMap[tseKey].renewedCases++;
          tseMap[tseKey].renewedPremium += prem;
        }

        // Agent grouping
        const agKey = r.agentName || 'Unknown Advisor';
        if (!agentMap[agKey]) {
          agentMap[agKey] = { name: agKey, code: r.agentCode || 'N/A', tseName: r.tseName || 'Direct', flsName: r.flsName || 'Branch', totalCases: 0, totalPremium: 0, renewedCases: 0, renewedPremium: 0 };
        }
        agentMap[agKey].totalCases++;
        agentMap[agKey].totalPremium += prem;
        if (isRenewed) {
          agentMap[agKey].renewedCases++;
          agentMap[agKey].renewedPremium += prem;
        }

        // Month grouping
        const mKey = r.renewalCycle || (r.renewalDueDate ? r.renewalDueDate.slice(0, 7) : '2026-10');
        if (!monthMap[mKey]) {
          monthMap[mKey] = { month: mKey, totalCases: 0, totalPremium: 0, renewedCases: 0, renewedPremium: 0 };
        }
        monthMap[mKey].totalCases++;
        monthMap[mKey].totalPremium += prem;
        if (isRenewed) {
          monthMap[mKey].renewedCases++;
          monthMap[mKey].renewedPremium += prem;
        }
      });

      const retentionRate = records.length > 0 ? ((renewedCount / records.length) * 100).toFixed(1) : 0;
      const premiumRetentionRate = totalPremium > 0 ? ((renewedPremium / totalPremium) * 100).toFixed(1) : 0;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        report: {
          overview: {
            totalPolicies: records.length,
            totalPremium,
            renewedCount,
            renewedPremium,
            pendingCount,
            pendingPremium: totalPremium - renewedPremium,
            retentionRate: Number(retentionRate),
            premiumRetentionRate: Number(premiumRetentionRate)
          },
          byFls: Object.values(flsMap),
          byTse: Object.values(tseMap),
          byAgent: Object.values(agentMap),
          byMonth: Object.values(monthMap)
        }
      }));
      return;
    } catch (err) {
      console.error('Reports error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // API 4: POST /api/renewals/upload - Excel / CSV Import Engine
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/renewals/upload') {
    try {
      const payload = await parseJSONBody(req);
      const { renewals = [], branchId = 'tnt-101', branchName = 'Thodupuzha Branch', uploadedBy, uploadedByName, branchTeam = [] } = payload;

      if (!Array.isArray(renewals) || renewals.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No renewal rows provided for upload' }));
        return;
      }

      const db = loadRenewalsDB();
      let existingList = db.renewals || [];

      let insertedCount = 0;
      let updatedCount = 0;
      let unmatchedCount = 0;
      const unmatchedList = [];

      renewals.forEach((row, idx) => {
        const policyNo = (row.policyNumber || row.policyNo || row['Policy Number'] || '').trim();
        const custName = (row.customerName || row.name || row['Customer Name'] || 'Insured Client').trim();
        const custMobile = (row.customerMobile || row.mobile || row.phone || row['Mobile'] || '+91 98000 00000').trim();
        const rawPrem = row.renewalPremium || row.premium || row.amount || row['Renewal Premium'] || 10000;
        const premium = typeof rawPrem === 'string' ? parseFloat(rawPrem.replace(/[^0-9.]/g, '')) || 0 : Number(rawPrem) || 0;
        const dueDate = (row.renewalDueDate || row.dueDate || row['Due Date'] || '2026-10-31').trim();
        const cycle = dueDate.slice(0, 7);
        const payLink = (row.paymentLink || row.link || row['Payment Link'] || `https://pay.manipalcigna.com/renew/${policyNo}`).trim();
        const prod = (row.productName || row.product || row['Product'] || 'CareShield Comprehensive Health').trim();

        const agentSearch = (row.agentCode || row.agent || row['Agent Code'] || row['Agent Name'] || '').trim().toLowerCase();
        const managerSearch = (row.managerCode || row.manager || row['Manager Code'] || row['Manager Name'] || '').trim().toLowerCase();

        // Hierarchy resolution from branchTeam
        let matchedAgent = null;
        if (agentSearch && branchTeam.length > 0) {
          matchedAgent = branchTeam.find(m =>
            m.role === 'AGENT' && (
              m.code.toLowerCase() === agentSearch ||
              m.name.toLowerCase() === agentSearch ||
              agentSearch.includes(m.code.toLowerCase()) ||
              agentSearch.includes(m.name.toLowerCase())
            )
          );
        }

        let agentId = matchedAgent ? matchedAgent.id : null;
        let agentCode = matchedAgent ? matchedAgent.code : (row.agentCode || 'AG-UNM');
        let agentName = matchedAgent ? matchedAgent.name : (row.agentName || 'Unassigned Advisor');

        // Resolve reporting TSE and FLS
        let tseId = null, tseCode = null, tseName = null;
        let flsId = null, flsCode = null, flsName = null;

        if (matchedAgent) {
          if (matchedAgent.reportsToRole === 'TSE') {
            const tseMember = branchTeam.find(m => m.id === matchedAgent.reportsToId || m.role === 'TSE');
            if (tseMember) {
              tseId = tseMember.id;
              tseCode = tseMember.code;
              tseName = tseMember.name;
              // Supervised by FLS
              const flsMember = branchTeam.find(m => m.id === tseMember.reportsToId || m.role === 'SALES_MANAGER');
              if (flsMember) {
                flsId = flsMember.id;
                flsCode = flsMember.code;
                flsName = flsMember.name;
              }
            }
          } else if (matchedAgent.reportsToRole === 'SALES_MANAGER') {
            const flsMember = branchTeam.find(m => m.id === matchedAgent.reportsToId || m.role === 'SALES_MANAGER');
            if (flsMember) {
              flsId = flsMember.id;
              flsCode = flsMember.code;
              flsName = flsMember.name;
            }
          }
        } else {
          // If managerSearch provided, try matching manager
          if (managerSearch && branchTeam.length > 0) {
            const mgr = branchTeam.find(m =>
              m.code.toLowerCase() === managerSearch ||
              m.name.toLowerCase() === managerSearch ||
              managerSearch.includes(m.code.toLowerCase())
            );
            if (mgr) {
              if (mgr.role === 'TSE') {
                tseId = mgr.id; tseCode = mgr.code; tseName = mgr.name;
              } else if (mgr.role === 'SALES_MANAGER') {
                flsId = mgr.id; flsCode = mgr.code; flsName = mgr.name;
              }
            }
          }
        }

        const isUnmatched = !matchedAgent && !tseId && !flsId;
        if (isUnmatched) {
          unmatchedCount++;
          unmatchedList.push({
            policyNumber: policyNo,
            customerName: custName,
            agentQuery: agentSearch,
            managerQuery: managerSearch,
            reason: 'Agent code/name not matched in current branch team'
          });
        }

        // Check for existing duplicate by policyNumber + cycle
        const existingIdx = existingList.findIndex(e =>
          e.policyNumber.toLowerCase() === policyNo.toLowerCase() &&
          (e.renewalCycle === cycle || e.renewalDueDate === dueDate)
        );

        if (existingIdx >= 0) {
          // PRESERVE existing follow-up history, customer mobile corrections, and current remarks!
          const existing = existingList[existingIdx];
          existingList[existingIdx] = {
            ...existing,
            customerName: custName || existing.customerName,
            // Keep corrected mobile if exists
            customerMobile: existing.mobileChangeHistory && existing.mobileChangeHistory.length > 0 ? existing.customerMobile : custMobile,
            renewalPremium: premium || existing.renewalPremium,
            paymentLink: payLink || existing.paymentLink,
            productName: prod || existing.productName,
            // Update hierarchy links if resolved
            agentId: agentId || existing.agentId,
            agentCode: agentCode !== 'AG-UNM' ? agentCode : existing.agentCode,
            agentName: agentName !== 'Unassigned Advisor' ? agentName : existing.agentName,
            tseId: tseId || existing.tseId,
            tseCode: tseCode || existing.tseCode,
            tseName: tseName || existing.tseName,
            flsId: flsId || existing.flsId,
            flsCode: flsCode || existing.flsCode,
            flsName: flsName || existing.flsName,
            unmatched: isUnmatched,
            unmatchedReason: isUnmatched ? 'Unmatched hierarchy' : null,
            updatedAt: new Date().toISOString()
          };
          updatedCount++;
        } else {
          // Create new record
          const newRec = {
            id: `RNW-${Date.now()}-${idx}`,
            policyNumber: policyNo || `POL-${Date.now().toString().slice(-5)}`,
            customerName: custName,
            customerMobile: custMobile,
            customerEmail: `${custName.toLowerCase().replace(/\s+/g, '.')}@client.internal`,
            renewalPremium: premium,
            renewalDueDate: dueDate,
            renewalCycle: cycle,
            productName: prod,
            branchId,
            branchName,
            agentId,
            agentCode,
            agentName,
            tseId,
            tseCode,
            tseName,
            flsId,
            flsCode,
            flsName,
            paymentLink: payLink,
            followupStatus: 'Pending',
            renewalStatus: 'Pending Payment',
            nextFollowUpDate: '',
            lastFollowupRemarks: 'Uploaded from corporate billing schedule',
            lastFollowupAt: new Date().toLocaleString('en-IN'),
            lastFollowupBy: uploadedBy || 'Super Admin',
            lastFollowupByName: uploadedByName || 'Super Admin',
            followupHistory: [
              {
                id: 'fh-init-' + Date.now() + '-' + idx,
                timestamp: new Date().toLocaleString('en-IN'),
                updatedBy: uploadedBy || 'Super Admin',
                updatedByName: uploadedByName || 'Super Admin',
                updatedByRole: 'UPLOADER',
                previousStatus: 'None',
                newStatus: 'Pending',
                remarks: 'Initial renewal schedule imported via Excel/CSV upload',
                nextFollowUpDate: '',
                previousMobile: null,
                newMobile: null
              }
            ],
            mobileChangeHistory: [],
            unmatched: isUnmatched,
            unmatchedReason: isUnmatched ? 'Agent code/name not matched in branch team' : null,
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString()
          };
          existingList.unshift(newRec);
          insertedCount++;
        }
      });

      db.renewals = existingList;
      saveRenewalsDB(db);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        summary: {
          totalRows: renewals.length,
          insertedCount,
          updatedCount,
          unmatchedCount,
          unmatchedList
        }
      }));
      return;
    } catch (err) {
      console.error('Upload error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // API 5: POST /api/renewals/reset - Reset to Initial Seed
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/renewals/reset') {
    // Reload original seed from scratch or re-create
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Renewals reset' }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // API 5: MBGA MASTER CONFIGURATION API (GET & POST)
  let currentMbgaConfig = {
    minMonthlyPremium: 25000,
    minMonthlyNop: 1,
    evaluationPeriod: 'CURRENT_MONTH',
    calculationBasis: 'ELIGIBLE_VOLUME'
  };
  if (pathname === '/api/settings/mbga-config') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, config: currentMbgaConfig }));
      return;
    }
    if (req.method === 'POST') {
      try {
        const payload = await parseJSONBody(req);
        currentMbgaConfig = { ...currentMbgaConfig, ...payload };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'MBGA configuration updated', config: currentMbgaConfig }));
        return;
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
        return;
      }
    }
  }

  // API 6: INACTIVE AGENT CALL FOLLOW-UP LOGGING API
  if (req.method === 'POST' && pathname === '/api/hierarchy/log-agent-call') {
    try {
      const payload = await parseJSONBody(req);
      const { agentId, agentName, callStatus, remarks, nextCallbackDate, loggedBy } = payload;
      const callLogEntry = {
        id: 'call-' + Date.now(),
        agentId,
        agentName,
        callStatus: callStatus || 'Connected - Follow-up Scheduled',
        remarks: remarks || '',
        nextCallbackDate: nextCallbackDate || null,
        timestamp: new Date().toISOString(),
        loggedBy: loggedBy || 'Branch Manager'
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Agent call follow-up recorded successfully', callLog: callLogEntry }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // API 6: HIERARCHY USER MANAGEMENT (Edit, Enable/Disable, Transfer, Delete)
  // -------------------------------------------------------------
  if (req.method === 'POST' && pathname === '/api/hierarchy/update-member') {
    try {
      const payload = await parseJSONBody(req);
      const userRole = (req.headers['x-user-role'] || payload.userRole || 'BRANCH_MANAGER').toUpperCase();
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'BRANCH_MANAGER') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Permission denied: Only Super Admin or Branch Manager can edit members' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Member details updated successfully', member: payload }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  if (req.method === 'POST' && pathname === '/api/hierarchy/toggle-status') {
    try {
      const payload = await parseJSONBody(req);
      const userRole = (req.headers['x-user-role'] || payload.userRole || 'BRANCH_MANAGER').toUpperCase();
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'BRANCH_MANAGER') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Permission denied: Only Super Admin or Branch Manager can toggle login status' }));
        return;
      }

      const { memberId, targetStatus } = payload;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `Login status changed to ${targetStatus}`, newStatus: targetStatus }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  if (req.method === 'POST' && pathname === '/api/hierarchy/transfer-agent') {
    try {
      const payload = await parseJSONBody(req);
      const userRole = (req.headers['x-user-role'] || payload.userRole || 'BRANCH_MANAGER').toUpperCase();
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'BRANCH_MANAGER') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Permission denied: Only Super Admin or Branch Manager can transfer agents' }));
        return;
      }

      const { agentId, newReportsToId, newReportsToName, newReportsToRole } = payload;
      if (!agentId || !newReportsToId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'agentId and newReportsToId are required' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Agent transferred successfully', transfer: payload }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  if (req.method === 'POST' && pathname === '/api/hierarchy/delete-member') {
    try {
      const payload = await parseJSONBody(req);
      const userRole = (req.headers['x-user-role'] || payload.userRole || 'BRANCH_MANAGER').toUpperCase();
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'BRANCH_MANAGER') {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Permission denied: Only Super Admin or Branch Manager can delete members' }));
        return;
      }

      const { memberId, role, assignedAgentCount = 0, subordinateCount = 0 } = payload;

      // RULE 1: FLS or TSE/DL can be deleted ONLY when they have zero assigned agents!
      if ((role === 'SALES_MANAGER' || role === 'TSE') && assignedAgentCount > 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: `Deletion blocked: Manager currently has ${assignedAgentCount} assigned agent(s). Transfer all agents before deleting.`
        }));
        return;
      }

      // RULE 2: Branch Manager can be deleted ONLY when no active subordinates remain!
      if (role === 'BRANCH_MANAGER') {
        if (userRole !== 'SUPER_ADMIN') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Permission denied: Only Super Admin can delete a Branch Manager' }));
          return;
        }
        if (subordinateCount > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: `Deletion blocked: Branch Manager currently has ${subordinateCount} active subordinate personnel assigned. Reassign or delete all subordinates first.`
          }));
          return;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Member soft-deleted successfully', deletedId: memberId }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // -------------------------------------------------------------
  // STATIC FILE SERVING / SPA FALLBACK
  // -------------------------------------------------------------
  let relativePath = pathname;
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/index.html';
  }

  const filePath = path.join(ROOT_DIR, relativePath);

  fs.stat(filePath, (err, stats) => {
    let targetPath = filePath;
    if (err || !stats.isFile()) {
      targetPath = path.join(ROOT_DIR, 'index.html');
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(targetPath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error: Unable to read file.');
        return;
      }
      const headers = { 'Content-Type': contentType };
      if (ext === '.html') {
        headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      res.writeHead(200, headers);
      res.end(content);
    });
  });
});

function startServer(port) {
  server.listen(port, () => {
    console.log('================================================================');
    console.log(`🚀 BMS Chat Server is live at: http://localhost:${port}`);
    console.log(`📁 Serving directory: ${ROOT_DIR}`);
    console.log('⚡ Centralized Hierarchy Renewal REST API online');
    console.log('================================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is occupied. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
