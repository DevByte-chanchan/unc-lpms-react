const { ProgramDocument, Program, AcademicPeriod } = require('../models');

/**
 * Get program documents for a specific program and academic period
 */
exports.getProgramDocuments = async (req, res) => {
  try {
    const { program_id, academic_period_id } = req.query;

    if (!program_id || !academic_period_id) {
      return res.status(400).json({ error: 'program_id and academic_period_id required' });
    }

    const doc = await ProgramDocument.findOne({
      where: { program_id, academic_period_id },
      include: ['program', 'academicPeriod']
    });

    if (!doc) {
      return res.status(404).json({ error: 'No program documents found' });
    }

    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Create or update program documents
 * Program Head uploads all 3 documents at once
 */
exports.upsertProgramDocuments = async (req, res) => {
  try {
    const { program_id, academic_period_id, uploaded_by, uploaded_by_name } = req.body;

    if (!program_id || !academic_period_id || !uploaded_by) {
      return res.status(400).json({ error: 'program_id, academic_period_id, uploaded_by required' });
    }

    // Check if record exists
    let doc = await ProgramDocument.findOne({
      where: { program_id, academic_period_id }
    });

    const files = {
      po_peo_file: req.files?.po_peo ? req.files.po_peo[0].path : undefined,
      co_po_file: req.files?.co_po ? req.files.co_po[0].path : undefined,
      coaep_file: req.files?.coaep ? req.files.coaep[0].path : undefined,
      po_peo_filename: req.files?.po_peo ? req.files.po_peo[0].originalname : undefined,
      co_po_filename: req.files?.co_po ? req.files.co_po[0].originalname : undefined,
      coaep_filename: req.files?.coaep ? req.files.coaep[0].originalname : undefined
    };

    if (!doc) {
      // Create new record
      doc = await ProgramDocument.create({
        program_id,
        academic_period_id,
        uploaded_by,
        uploaded_by_name,
        ...files
      });
      res.status(201).json({ message: 'Program documents uploaded', doc });
    } else {
      // Update existing record
      await doc.update({
        uploaded_by,
        uploaded_by_name,
        ...files
      });
      res.json({ message: 'Program documents updated', doc });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Upload individual program document
 */
exports.uploadProgramDocument = async (req, res) => {
  try {
    const { program_id, academic_period_id, document_type, uploaded_by, uploaded_by_name } = req.body;

    if (!program_id || !academic_period_id || !document_type || !uploaded_by) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate document type
    const validTypes = ['po_peo_file', 'co_po_file', 'coaep_file'];
    if (!validTypes.includes(document_type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    let doc = await ProgramDocument.findOne({
      where: { program_id, academic_period_id }
    });

    if (!doc) {
      // Create new record with this document
      const data = {
        program_id,
        academic_period_id,
        uploaded_by,
        uploaded_by_name,
        [document_type]: req.file.path,
        [document_type.replace('_file', '_filename')]: req.file.originalname
      };
      doc = await ProgramDocument.create(data);
    } else {
      // Update existing record with new file
      await doc.update({
        [document_type]: req.file.path,
        [document_type.replace('_file', '_filename')]: req.file.originalname,
        uploaded_by,
        uploaded_by_name
      });
    }

    res.json({ message: `Document ${document_type} uploaded`, doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a specific program document
 */
exports.deleteProgramDocument = async (req, res) => {
  try {
    const { program_id, academic_period_id, document_type } = req.params;

    if (!program_id || !academic_period_id || !document_type) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const doc = await ProgramDocument.findOne({
      where: { program_id, academic_period_id }
    });

    if (!doc) {
      return res.status(404).json({ error: 'Program documents not found' });
    }

    // Clear the specific document
    const fileField = `${document_type}_file`;
    const filenameField = `${document_type}_filename`;
    
    await doc.update({
      [fileField]: null,
      [filenameField]: null
    });

    res.json({ message: 'Document deleted', doc });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get program documents status (check if all 3 are uploaded)
 */
exports.checkProgramDocumentsStatus = async (req, res) => {
  try {
    const { program_id, academic_period_id } = req.query;

    if (!program_id || !academic_period_id) {
      return res.status(400).json({ error: 'program_id and academic_period_id required' });
    }

    const doc = await ProgramDocument.findOne({
      where: { program_id, academic_period_id }
    });

    if (!doc) {
      return res.json({
        exists: false,
        po_peo_uploaded: false,
        co_po_uploaded: false,
        coaep_uploaded: false,
        all_uploaded: false
      });
    }

    const status = {
      exists: true,
      po_peo_uploaded: !!doc.po_peo_file,
      co_po_uploaded: !!doc.co_po_file,
      coaep_uploaded: !!doc.coaep_file,
      all_uploaded: !!(doc.po_peo_file && doc.co_po_file && doc.coaep_file),
      uploaded_by: doc.uploaded_by_name,
      uploaded_at: doc.updated_at
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
