// Local mock API backend for M3RGEEN Aion 2 UI development & testing
// Reflects release_unified logic: Discord-only LFG single-source-of-truth, instant ILvl/Level verification, no 24h CP cooldown.

const mockUser = {
  id: 'dev_user_local_1',
  username: 'M3RGEEN_Dev',
  displayName: 'قائد المرجين (تجريبي)',
  avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
  character_name: 'مرجين_الفاتح',
  character_avatar: 'https://shugo.gg/avatars/hero_dc.png',
  roles: [{ id: '1085324541743542292', name: 'Global' }],
  aion2Profile: {
    character_name: 'مرجين_الفاتح',
    selected_class: 'Gladiator',
    profile_image: 'https://shugo.gg/avatars/hero_dc.png',
    assigned_guild: 'M3RGEEN_GLOBAL',
    combat_power: 45000,
    item_level: 2150,
    character_level: 50,
    guild_app_status: 'ACCEPTED',
    guild_type: 'M3RGEEN_GLOBAL',
    race_name: 'Elyos',
    server_name: 'Siel',
    last_cp_sync_at: new Date().toISOString(),
    cp_sync_status: 'SUCCESS',
    cp_sync_label: 'آخر قيمة محفوظة'
  }
};

let nextGroupId = 200;
const mockGroups = [
  {
    id: 101,
    group_id: 101,
    type: 'Sanctuary',
    name: 'Sanctuary',
    mode: 'Normal',
    slots: 10,
    capacity: 10,
    filled_slots: 2,
    members_count: 2,
    roles: ['Tank', 'Healer', 'DPS', 'DPS', 'DPS', 'Tank', 'Healer', 'DPS', 'DPS', 'DPS'],
    members: ['KRAO', 'LUMINA', null, null, null, null, null, null, null, null],
    creator_id: 'user_krao_99',
    creator: 'KRAO',
    creator_avatar: 'https://shugo.gg/avatars/krao.png',
    status: 'open',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    gs: 1800,
    members_details: [
      {
        discord_id: 'user_krao_99',
        character_name: 'KRAO',
        character_avatar: 'https://shugo.gg/avatars/krao.png',
        player_class: 'Templar',
        role: 'LEADER',
        joined_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        discord_id: 'user_healer_55',
        character_name: 'LUMINA',
        character_avatar: 'https://shugo.gg/avatars/cleric.png',
        player_class: 'Cleric',
        role: 'MEMBER',
        joined_at: new Date(Date.now() - 1800000).toISOString()
      }
    ],
    can_join: true,
    can_leave: false
  },
  {
    id: 102,
    group_id: 102,
    type: 'Dungeons',
    name: 'Draupnir Cave',
    mode: 'Exploration',
    slots: 6,
    capacity: 6,
    filled_slots: 1,
    members_count: 1,
    roles: ['Tank', 'Healer', 'DPS', 'DPS', 'DPS', 'DPS'],
    members: ['SHADOW_SNIPER', null, null, null, null, null],
    creator_id: 'user_sniper_77',
    creator: 'SHADOW_SNIPER',
    creator_avatar: 'https://shugo.gg/avatars/ranger.png',
    status: 'open',
    created_at: new Date(Date.now() - 900000).toISOString(),
    gs: 2000,
    members_details: [
      {
        discord_id: 'user_sniper_77',
        character_name: 'SHADOW_SNIPER',
        character_avatar: 'https://shugo.gg/avatars/ranger.png',
        player_class: 'Ranger',
        role: 'LEADER',
        joined_at: new Date(Date.now() - 900000).toISOString()
      }
    ],
    can_join: true,
    can_leave: false
  }
];

function readJsonBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function handleMockApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // 1. Session / Me
  if (pathname === '/api/auth/me') {
    return sendJson(res, 200, { user: mockUser });
  }

  // 2. Mock Login / Exchange
  if (pathname === '/api/auth/login') {
    return sendJson(res, 200, {
      authorizeUrl: 'https://discord.com/oauth2/authorize?client_id=mock',
      attempt: 'mock_dev_attempt_' + Date.now()
    });
  }

  if (pathname === '/api/auth/exchange') {
    return sendJson(res, 200, {
      pending: false,
      token: 'mock_dev_session_token_' + Date.now(),
      user: mockUser
    });
  }

  if (pathname === '/api/auth/logout') {
    return sendJson(res, 200, { success: true });
  }

  // 3. LFG Get Groups
  if (pathname === '/api/auth/aion2-lfg' && req.method === 'GET') {
    const userId = mockUser.id;
    const computedGroups = mockGroups.map(g => {
      const isMember = g.members_details.some(m => m.discord_id === userId);
      const isLeader = g.creator_id === userId;
      return {
        ...g,
        status: 'open',
        capacity: g.capacity || g.slots || 6,
        members: g.members_details.map(m => m.character_name),
        can_join: !isMember && g.filled_slots < g.slots && g.status.toLowerCase() === 'open',
        can_leave: isMember && !isLeader,
        can_close: isLeader
      };
    });
    return sendJson(res, 200, { success: true, groups: computedGroups });
  }

  // 4. LFG Create Group (Unified Discord-bot contract)
  if (pathname === '/api/auth/aion2-lfg/create' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const newId = ++nextGroupId;
    const newGroup = {
      id: newId,
      group_id: newId,
      type: body.type || 'Dungeons',
      name: body.name || 'Draupnir Cave',
      mode: body.mode || 'Exploration',
      slots: (body.type === 'Sanctuary' || body.type === 'SANCTUARY') ? 10 : 6,
      capacity: (body.type === 'Sanctuary' || body.type === 'SANCTUARY') ? 10 : 6,
      filled_slots: 1,
      members_count: 1,
      roles: (body.type === 'Sanctuary' || body.type === 'SANCTUARY') 
        ? ['Tank', 'Healer', 'DPS', 'DPS', 'DPS', 'Tank', 'Healer', 'DPS', 'DPS', 'DPS']
        : ['Tank', 'Healer', 'DPS', 'DPS', 'DPS', 'DPS'],
      members: (body.type === 'Sanctuary' || body.type === 'SANCTUARY')
        ? [mockUser.character_name, null, null, null, null, null, null, null, null, null]
        : [mockUser.character_name, null, null, null, null, null],
      creator_id: mockUser.id,
      creator: mockUser.character_name,
      creator_avatar: mockUser.character_avatar,
      status: 'open',
      created_at: new Date().toISOString(),
      gs: mockUser.aion2Profile.item_level || 2150,
      members_details: [
        {
          discord_id: mockUser.id,
          character_name: mockUser.character_name,
          character_avatar: mockUser.character_avatar,
          player_class: mockUser.aion2Profile.selected_class || 'Gladiator',
          role: 'LEADER',
          joined_at: new Date().toISOString()
        }
      ],
      can_join: false,
      can_leave: false,
      can_close: true
    };
    mockGroups.unshift(newGroup);
    return sendJson(res, 200, {
      success: true,
      status: 'CREATED_AND_PUBLISHED',
      group: newGroup
    });
  }

  // 5. LFG Join Group
  if (pathname === '/api/auth/aion2-lfg/join' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const targetGroup = mockGroups.find(g => g.id === Number(body.groupId) || g.group_id === Number(body.groupId));
    if (!targetGroup) {
      return sendJson(res, 404, { success: false, error: 'المجموعة غير موجودة أو انتهت صلاحيتها.' });
    }
    if (targetGroup.members_details.some(m => m.discord_id === mockUser.id)) {
      return sendJson(res, 400, { success: false, error: 'أنت منضم بالفعل إلى هذه المجموعة.' });
    }
    if (targetGroup.filled_slots >= targetGroup.slots) {
      return sendJson(res, 400, { success: false, error: 'المجموعة مكتملة العدد.' });
    }

    targetGroup.members_details.push({
      discord_id: mockUser.id,
      character_name: mockUser.character_name,
      character_avatar: mockUser.character_avatar,
      player_class: mockUser.aion2Profile.selected_class || 'Gladiator',
      role: 'MEMBER',
      joined_at: new Date().toISOString()
    });
    targetGroup.members = targetGroup.members_details.map(m => m.character_name);
    targetGroup.filled_slots = targetGroup.members_details.length;
    targetGroup.members_count = targetGroup.members_details.length;

    return sendJson(res, 200, {
      success: true,
      message: 'تم التحقق والانضمام بنجاح.'
    });
  }

  // 6. LFG Leave Group
  if (pathname === '/api/auth/aion2-lfg/leave' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const targetGroup = mockGroups.find(g => g.id === Number(body.groupId) || g.group_id === Number(body.groupId));
    if (targetGroup) {
      targetGroup.members_details = targetGroup.members_details.filter(m => m.discord_id !== mockUser.id);
      targetGroup.members = targetGroup.members_details.map(m => m.character_name);
      targetGroup.filled_slots = targetGroup.members_details.length;
      targetGroup.members_count = targetGroup.members_details.length;
    }
    return sendJson(res, 200, { success: true, message: 'تمت المغادرة بنجاح.' });
  }

  // 7. Guild Members
  if (pathname === '/api/auth/aion2-guilds') {
    return sendJson(res, 200, {
      success: true,
      members: [
        {
          discord_id: mockUser.id,
          character_name: mockUser.character_name,
          character_avatar: mockUser.character_avatar,
          selected_class: 'Gladiator',
          assigned_guild: 'M3RGEEN_GLOBAL',
          combat_power: 45000
        },
        {
          discord_id: 'user_krao_99',
          character_name: 'KRAO',
          character_avatar: 'https://shugo.gg/avatars/krao.png',
          selected_class: 'Templar',
          assigned_guild: 'M3RGEEN_GLOBAL',
          combat_power: 42300
        },
        {
          discord_id: 'user_sniper_77',
          character_name: 'SHADOW_SNIPER',
          character_avatar: 'https://shugo.gg/avatars/ranger.png',
          selected_class: 'Ranger',
          assigned_guild: 'EMPEROR',
          combat_power: 46800
        }
      ],
      stats: {
        M3RGEEN_GLOBAL: {
          total_members: 2,
          avg_combat_power: 43650,
          class_counts: { Gladiator: 1, Templar: 1 }
        },
        EMPEROR: {
          total_members: 1,
          avg_combat_power: 46800,
          class_counts: { Ranger: 1 }
        }
      }
    });
  }

  // 8. Leaderboard
  if (pathname === '/api/auth/aion2-leaderboard') {
    return sendJson(res, 200, {
      success: true,
      me: {
        rank: 1,
        total_points: 1250,
        character_name: mockUser.character_name,
        character_avatar: mockUser.character_avatar
      },
      leaderboard: [
        {
          rank: 1,
          character_name: mockUser.character_name,
          character_avatar: mockUser.character_avatar,
          total_points: 1250,
          completed_groups: 14,
          unique_guildmates: 8
        },
        {
          rank: 2,
          character_name: 'KRAO',
          character_avatar: 'https://shugo.gg/avatars/krao.png',
          total_points: 1100,
          completed_groups: 11,
          unique_guildmates: 6
        }
      ]
    });
  }

  // 9. Notifications
  if (pathname === '/api/auth/notifications' || pathname === '/api/auth/aion2-notifications') {
    return sendJson(res, 200, { success: true, notifications: [] });
  }

  // Fallback 404
  return sendJson(res, 404, { success: false, error: 'Endpoint not found on mock dev server' });
}

module.exports = {
  handleMockApi,
  mockUser,
  mockGroups
};
