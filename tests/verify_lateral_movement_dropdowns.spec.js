import { test, expect } from '@playwright/test';

test('Verify LateralMovement Dropdown rendering and AnimatorController Fallback', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Navigate to editor
  await page.goto('http://localhost:8080/editor.html');
  await page.waitForTimeout(5000);

  // Evaluate the test script inside the page context
  const testResults = await page.evaluate(async () => {
    try {
        // 1. Test renderAnimationStateSelectOrInput
        if (typeof renderAnimationStateSelectOrInput === 'undefined') {
            return { success: false, error: "renderAnimationStateSelectOrInput is not defined globally or accessible." };
        }

        // Mock Materia and components
        const mockMateriaWithController = {
            id: 123,
            name: "Test Character",
            getComponentByName: (name) => {
                if (name === 'AnimatorController') {
                    return {
                        states: new Map([
                            ["idle", {}],
                            ["run", {}],
                            ["jump", {}]
                        ])
                    };
                }
                return null;
            }
        };

        const mockMateriaNoController = {
            id: 124,
            name: "Static Object",
            getComponentByName: () => null
        };

        // Render with controller
        const htmlWithController = renderAnimationStateSelectOrInput(mockMateriaWithController, "idleAnim", "run");
        const hasSelect = htmlWithController.includes('<select') && htmlWithController.includes('run') && htmlWithController.includes('option value="idle"');

        // Render without controller
        const htmlNoController = renderAnimationStateSelectOrInput(mockMateriaNoController, "idleAnim", "run");
        const hasInput = htmlNoController.includes('<input') && htmlNoController.includes('value="run"');

        // 2. Test AnimatorController Fallback transition logic
        const Components = window.Components || {};
        if (!Components.AnimatorController) {
            return {
                success: false,
                error: "Components.AnimatorController is not available on window.Components",
                hasSelect,
                hasInput
            };
        }

        // Instantiate AnimatorController
        const controller = new Components.AnimatorController({
            id: 999,
            name: "Dummy Materia",
            getComponent: () => null,
            getComponentByName: () => null
        });

        // Add a mock animator to satisfy _resolveAllTargets
        controller.animator = {
            play: () => {},
            stop: () => {},
            loadAnimationClip: () => {},
            materia: controller.materia,
            isPlaying: false,
            animationClipPath: ""
        };

        // Set up custom test controller state mapping
        controller.controller = {
            entryState: "entry_idle",
            transitions: [
                {
                    from: "entry_idle",
                    to: "jump_state",
                    conditions: [
                        { parameter: "isJumping", operator: "True" }
                    ]
                }
            ]
        };

        controller.states = new Map([
            ["entry_idle", { name: "entry_idle", animationClip: "idle_clip" }],
            ["jump_state", { name: "jump_state", animationClip: "jump_clip" }]
        ]);

        controller.currentStateName = "jump_state";
        controller.parameters = { isJumping: false }; // Condition not met anymore!

        // Force check transitions
        controller._checkTransitions();

        // Since condition "isJumping == True" is now false, and there are no other transition options,
        // it should have fallen back to "entry_idle"
        const fallbackSuccess = controller.currentStateName === "entry_idle";

        return {
            success: true,
            hasSelect,
            hasInput,
            fallbackSuccess,
            currentStateAfterFallback: controller.currentStateName
        };

    } catch (e) {
        return { success: false, error: e.stack };
    }
  });

  console.log("Test execution results:", testResults);

  expect(testResults.success).toBe(true);
  expect(testResults.hasSelect).toBe(true);
  expect(testResults.hasInput).toBe(true);
  expect(testResults.fallbackSuccess).toBe(true);
});
