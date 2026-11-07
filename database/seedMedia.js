// User Story #24 — repeatable demo photos for seeded IDPs.
// Keep database access in the existing IDPMedia Entity.
// 40 assets -> 100 associated media rows, with no duplicate media for a project.
const fs = require('node:fs');
const path = require('node:path');
const IDPMedia = require('../backend/entity/IDPMedia');

const STYLE_NAMES = [
  'Contemporary', 'Modern', 'Japanese', 'Minimalism', 'Scandinavian',
  'Industrial', 'Luxury', 'Peranakan', 'Persian', 'Japandi', 'Classical',
  'Eclectic', 'Country', 'Rustic', 'Wabi Sabi', 'Futuristic',
  'Mid Century', 'Bohemian', 'Vintage',
];
const ROOM_NAMES = [
  'Living Room', 'Dining Room', 'Kitchen', 'Bedroom', 'Bathroom', 'Foyer',
  'Balcony', 'Study Room', 'TV Console', 'Kitchen Island', 'Altar',
  'Walk In Wardrobe', 'Service Yard', 'Feature Wall', 'Window Seat',
  'Kitchen Peninsula', 'Bar Counter', 'Platform Bed', 'Garden',
  'Swimming Pool', 'Yard',
];
const slug = value => value.toLowerCase().replace(/\s+/g, '-');
const MEDIA_DIR = path.join(__dirname, 'seed-media');

function seedMedia(db, target = 150) {
  if (!Number.isSafeInteger(target) || target < 40) {
    throw new Error('Seed target must be at least 40 to cover all categories');
  }
  const projects = db.prepare('SELECT id, style, type FROM idp ORDER BY id').all()
    .map(p => ({...p, roomTypes: JSON.parse(p.type)}));
  if (projects.length < target) throw new Error(`Need ${target} IDPs; found ${projects.length}`);
  const mediaEntity = new IDPMedia(db);
  const images = [];
  for (const style of STYLE_NAMES) {
    images.push({kind:'style',tag:style, name:`style-${slug(style)}.jpg`,folder:'styles'});
  }
  for (const room of ROOM_NAMES) {
    images.push({kind:'room',tag:room, name:`room-${slug(room)}.jpg`,folder:'rooms'});
  }
  // Read everything before inserting anything: missing assets fail fast.
  for (const img of images) {
    img.bytes = fs.readFileSync(path.join(MEDIA_DIR,img.folder,img.name));
    if (img.bytes.length === 0) throw new Error(`Empty demo image: ${img.name}`);
  }
  const used = new Set();
  const assignment = [];
  // First make sure all 40 assets appear, mapped to a matching project where available.
  for (const img of images) {
    const match = projects.find(p => !used.has(p.id) &&
      (img.kind === 'style' ? p.style === img.tag : p.roomTypes.includes(img.tag)));
    if (!match) throw new Error(`No matching unassigned IDP for ${img.name}`);
    assignment.push({project:match,img});
    used.add(match.id);
  }
  // Fill the remaining 60 records deterministically, matching seeded IDP categories.
  for (const project of projects) {
    if (assignment.length === target) break;
    if (used.has(project.id)) continue;
    const image = images.find(i => i.kind === 'style' && i.tag === project.style)
      || images.find(i => i.kind === 'room' && project.roomTypes.includes(i.tag));
    if (!image) throw new Error(`No compatible demo image for IDP ${project.id}`);
    assignment.push({project,img:image});
    used.add(project.id);
  }
  if (assignment.length !== target) throw new Error(`Only assigned ${assignment.length}/${target} IDPs`);
  for (const {project,img} of assignment) {
    mediaEntity.createMedia(project.id, img.name, 'image/jpeg', img.bytes);
  }
  return { records: assignment.length, assetsUsed: new Set(assignment.map(a => a.img.name)).size };
}
module.exports = { seedMedia };
