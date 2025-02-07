const config = require('./config');
const userIdFieldName = config.get('UserIdField');
const logger = require('./logger');
exports.tokenParser = (content, clientId, debugMode) => {
    const accessToken = content.access_token;

    const userId = accessToken.content[userIdFieldName];

    let group = {};

    let role = {};

    if (accessToken.content && accessToken.realm_access && accessToken.realm_access.roles && Array.isArray(accessToken.realm_access.roles)) {
    	role['X-Hasura-Realm-Role'] = (accessToken.content.realm_access.roles || []).join(',');
    }

    if (accessToken.content && Array.isArray(accessToken.content.group)) {
        group = parseGroup(accessToken.content.group);
    }

    const clientResource = accessToken.content.resource_access[clientId];

    if (
        accessToken.content &&
        accessToken.content.resource_access &&
        clientResource &&
        Array.isArray(clientResource.roles) &&
        clientResource.roles.length !== 0
    ) {
        role['X-Hasura-Role'] = clientResource.roles[0];
    } else {
        console.warn('Role not found in the token please verify the client ID is valid or the role scope is enabled');
    }

    return {
        'token': accessToken,
        'X-Hasura-User-Id': userId,
        'X-Debug-Mode-Enabled': (debugMode || false).toString(),
        ...group,
        ...role,
    };
};

const parseGroup = exports.parseGroup = (group, defaultGroup) => {
    const parsedGroup = {
    };

    const rootGroups = group.map(res => res.split('/')[1])
        .filter((item, index, self) => self.indexOf(item) === index);

    if (rootGroups.length === 1) {
        parsedGroup['X-Hasura-Organization-Id'] = rootGroups[0];
    } else {
        if (typeof defaultGroup === 'number' && !isNaN(defaultGroup)) {
            parsedGroup['X-Hasura-Organization-Id'] = rootGroups[defaultGroup];
        } else {
            logger.info('Default organization assigned as first');
            parsedGroup['X-Hasura-Organization-Id'] = rootGroups[0];
        }
    }

    // TODO: IMPROVE THIS FUNCTION
    const subGroup = group.map(res => res.split('/')[2])
        .filter(res => !!res)
        .filter((item, index, self) => self.indexOf(item) === index);

    if (subGroup[0]) {
        parsedGroup['X-Hasura-Sub-Group-Id'] = subGroup[0];
    }

    return parsedGroup;
};
