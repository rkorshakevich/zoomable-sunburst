const arrangeIntoTree = paths => {
  let tree = [];

  for (let i = 0; i < paths.length; i++) {
    let path = paths[i].path;
    const size = paths[i].size;
    const displayValue = paths[i].displayValue;
    let currentLevel = tree;
    for (let j = 0; j < path.length; j++) {
      let part = path[j];

      let existingPath = findWhere(currentLevel, 'name', part);

      if (existingPath) {
        currentLevel = existingPath.children;
      } else {
        let newPart = {
          name: part,
          value: size,
          displayValue: displayValue,
          children: [],
        };

        currentLevel.push(newPart);
        currentLevel = newPart.children;
      }
    }
  }
  return tree[0];
};

const findWhere = (array, key, value) => {
  let t = 0;
  while (t < array.length && array[t][key] !== value) {
    t++;
  }

  if (t < array.length) {
    return array[t];
  } else {
    return false;
  }
};

export { arrangeIntoTree };
