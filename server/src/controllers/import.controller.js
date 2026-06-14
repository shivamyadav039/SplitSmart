import * as csvImportService from '../services/csvImport.service.js';

export async function parse(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a CSV file.' });
    }
    const { groupId } = req.body;
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required to associate imported expenses.' });
    }

    const result = await csvImportService.initializeImportSession(groupId, req.file.buffer);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function confirm(req, res, next) {
  try {
    const { importSessionId, resolutions } = req.body;
    if (!importSessionId) {
      return res.status(400).json({ error: 'Import Session ID is required.' });
    }

    const result = await csvImportService.commitImportResolutions(importSessionId, resolutions);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
