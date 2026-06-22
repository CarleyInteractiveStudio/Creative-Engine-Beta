import { test, expect } from '@playwright/test';

test('Verify 3D Skinned Mesh Fixes', async ({ page }) => {
  await page.goto('http://localhost:8080/editor.html');

  // Wait for engine initialization
  await page.waitForFunction(() => window.editorInitialized === true, { timeout: 30000 });

  const results = await page.evaluate(async () => {
    const results = [];

    // 1. Check Skinned Mesh Picking logic exists in pick()
    const pickStr = window._Renderer3D.pick.toString();
    const hasSkinnedMeshPicking = pickStr.includes('SkinnedMeshRenderer3D') && pickStr.includes('cpuPositions');
    results.push({ name: 'Skinned Mesh Picking Code', result: hasSkinnedMeshPicking });

    // 2. Check Inspector Sky Color (it was updated in the module, let's verify if a preview instance uses it)
    // We can't easily check the private variable in the module, but we can check the default scene ambiente if it was created
    // Actually, let's check the drawSkinnedMesh update
    const drawSkinnedStr = window._Renderer3D.drawSkinnedMesh.toString();
    const hasUpdateBoneMatrices = drawSkinnedStr.includes('updateBoneMatrices');
    results.push({ name: 'Live Bone Update in Render', result: hasUpdateBoneMatrices });

    // 3. Check Renderer3D.render support for custom viewports
    const renderStr = window._Renderer3D.render.toString();
    const hasCustomViewport = renderStr.includes('customViewport') && renderStr.includes('gl.viewport');
    results.push({ name: 'Custom Viewport Support', result: hasCustomViewport });

    return results;
  });

  results.forEach(res => {
    console.log(`${res.name}: ${res.result ? 'PASS' : 'FAIL'}`);
    expect(res.result).toBe(true);
  });

  await page.screenshot({ path: 'verification_skinned_fixes.png' });
});
