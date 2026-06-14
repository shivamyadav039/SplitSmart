import * as groupService from '../services/group.service.js';

export async function getGroups(req, res, next) {
  try {
    const groups = await groupService.getGroupsForUser(req.user.id);
    res.status(200).json({ groups });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const { name } = req.body;
    const group = await groupService.createGroup(name, req.user.id);
    res.status(201).json(group);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function getMembers(req, res, next) {
  try {
    const members = await groupService.getGroupMembers(req.params.id);
    res.status(200).json({ members });
  } catch (error) {
    next(error);
  }
}

export async function addOrUpdateMember(req, res, next) {
  try {
    const { name, joined_at, left_at } = req.body;
    const result = await groupService.addOrUpdateGroupMember(req.params.id, name, joined_at, left_at);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function deleteMember(req, res, next) {
  try {
    const result = await groupService.removeGroupMember(req.params.id, req.params.userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
