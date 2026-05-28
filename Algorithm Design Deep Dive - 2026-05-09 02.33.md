# 🏆 FINAL BLUEPRINT: CIRCULAR LAYOUT OPTIMIZER

## 1. GOAL STATEMENT

To calculate a set of unique rotational angles $\{\theta'_i\}$ for $N$ complex closed shapes such that:

1.  No two shapes share any overlapping area (Gap $\ge 2$ pixels). (Hard Constraint)
2.  The resulting angular distribution is as uniform as possible. (Soft Goal)

## 2. INPUTS & OUTPUTS

- **Input:** A list of $N$ paths, $P = \{P_1, \dots, P_N\}$, each containing its SVG path data.
- **Output:** A set of final angles $\Theta'=\{\theta'_1, \dots, \theta'_N\}$ (Rounded integers).

## 3. CORE METHODOLOGY: Force-Directed Layout Simulation

The system iteratively calculates three primary directional forces ($\Delta\Theta$) acting on each path and adjusts the angle until the net force across all paths approaches zero (Equilibrium).

$$\text{Total Directional Shift for } P_i = \underbrace{\Delta\Theta_{\text{overlap}, i}}_{\text{Repel}} + \underbrace{\Delta\Theta_{\text{restoring}, i}}_{\text{Guide}} + \underbrace{\Delta\Theta_{\text{unique}, i}}_{\text{Anti-Collision}}$$

## 4. DETAILED FORCE CALCULATION (The Three Components)

### A. $\Delta\Theta_{\text{overlap}}$ (Directional Overlap Repulsion Force)

This force is responsible for maintaining the gap and provides a strong repulsive push when $S_{ij} \ge 2$. The direction must maximize separation.

1.  **Detection:** For every pair $(P_i, P_j)$, calculate $S_{ij}$ (shared pixels).
2.  **Force Magnitude:** If $S_{ij} &lt; 2$, the magnitude is 0 and there is no force contribution. If $S_{ij} \ge 2$, the magnitude $M$ is calculated using the refined formula:
    $$ M = K*{\text{rep}} \cdot (\max(0, S*{ij} - 1))^p $$
3.  **Directional Search:** We must test two hypotheses (CW and CCW) by applying small rotational increments $\delta$:
    - Calculate $S'_{i}(\theta_i + \delta)$ and $S''_{i}(\theta_i - \delta)$.
    - The required directional shift $\Delta\Theta_{\text{overlap}, i}$ is the direction ($\pm \delta$) that yields the largest _decrease_ in overlap area ($|S'_{i} - S_{ij}|$ vs $|S''_{i} - S_{ij}|$).

### B. $\Delta\Theta_{\text{restoring}}$ (Global Gap Restoration Force)

This force is based on minimizing the deviation of all adjacent angular gaps from the ideal average gap ($\Delta_{ideal} = 360/N$), regardless of path order.

1.  **Preparation:** Sort the current angles: $\theta'_{(1)}, \dots, \theta'_{(N)}$. Calculate $N$ gaps ($\text{Gap}_k$).
2.  **Deviation Calculation:** Find the gap that is closest to violating the ideal spacing (i.e., the smallest $\text{Gap}_k$).
3.  **Force Application:** For a given path $P_i$, its shift $\Delta\Theta_{\text{restoring}, i}$ is calculated by summing corrective pushes from both neighbors:
    - If Path $P_i$ contributes to Gap 1, and $\text{Gap}_1 &lt; \Delta_{ideal}$, then $P_i$ gets a directional push proportional to $(\Delta_{ideal} - \text{Gap}_1)$.

### C. $\Delta\Theta_{\text{unique}}$ (Anti-Collision Force)

This force maintains a minimal angular separation ($\delta_{\text{min}}$).

1.  **Detection:** For all $j$, calculate the smallest angular difference $|\Delta\theta_{ij}|$.
2.  **Force Application:** If $|\Delta\theta_{ij}| &lt; \delta_{\text{min}}$, then $\Delta\Theta_{\text{unique}, i}$ accumulates a repulsive push away from the cluster of nearby angles, proportional to how much it is violating the minimum separation distance.

## 5. EXECUTION PROTOCOL (The Simulation Loop)

1.  **Initialization:** Set random initial angles $\Theta^{(0)}$. Set $T$ (Initial Temp) and all force constants ($K_{\text{rep}}, K_{\text{spring}}$, etc.).
2.  **Iteration:**
    a. Calculate $S_{ij}$ for all pairs.
    b. Calculate $\Delta\Theta_{\text{overlap}, i}$, $\Delta\Theta_{\text{restoring}, i}$, and $\Delta\Theta_{\text{unique}, i}$.
    c. Sum them to get the final required directional shift: $\Delta \Theta_{i}^{\text{Total}}$.
    d. Update angle: $\theta_i^{\text{new}} = \text{Normalize}(\theta_i^{\text{current}} + \Delta\Theta_{\text{total}, i})$.
3.  **Termination:** Stop when the average magnitude of all three forces across all paths is below the convergence threshold ($\epsilon_F$).

## 6. IMPLEMENTATION STATUS (CODEBASE SNAPSHOT)

This status reflects the current implementation in src/lib/optimizer/run-optimizer.ts and UI integration in src/routes/+page.svelte.

### A. Overlap Repulsion Force

- [x] Pairwise overlap detection exists via detectOverlaps and overlap map access.
- [x] Minimum overlap threshold check exists (MIN_OVERLAP_PIXELS = 2).
- [x] Directional search exists and compares CW/CCW candidates over multiple step sizes.
- [x] Refined overlap magnitude model is implemented: $M = K_{rep} * (\max(0, S_{ij} - 1))^p$.
- [x] Overlap magnitude weighting is explicitly wired into the total force sum.

### B. Restoring Force (Uniform Angular Distribution)

- [x] Implemented with sorted-angle gap analysis and ideal gap calculation.
- [x] Neighbor-based corrective pushes are implemented via circular gap contributions.
- [x] Restoring force is weighted and clamped for stability (small active weight, bounded force).
- [x] Zero-bias normalization is implemented to avoid net rotational drift.
- [x] Per-iteration restoring diagnostics exist (raw sum vs normalized sum).

### C. Unique Force (Minimum Angular Separation)

- [x] Implemented via pairwise minimum angular distance checks.
- [x] Repulsive push is applied when angles violate the minimum separation threshold.

### D. Execution Protocol

- [x] Iterative simulation loop exists.
- [x] Convergence check by average force magnitude exists.
- [x] Angle normalization exists.
- [x] Progress reporting per iteration exists.
- [x] Cancellation support exists via AbortSignal and OptimizerCancelledError.
- [x] Optional initialization from randomized unique angles is implemented (seeded deterministic mode supported).
- [x] Final rounded integer output angles are implemented by default (with optional float output for analysis/tests).

### Recommended Next Implementation

Tune and validate force coupling (Overlap + Restoring + Unique) next.

Reason:

- Unique-force and overlap magnitude weighting are now implemented and covered by focused tests.
- The next risk is coefficient interaction and stability across real SVGs (oscillation, drift, overcorrection).
- Systematic tuning and scenario-based regression tests will improve visual quality and convergence reliability.

Suggested follow-up order:

1. Tune force constants and clamps (overlap, restoring, unique) against representative SVG scenarios.
2. Add regression tests for coupled-force stability and convergence quality.
3. Add optional diagnostics summary per run (min gap, overlap aggregate, stop reason metadata).
4. Decide whether randomized initialization should be default-on for production runs.

---

This comprehensive specification captures every interaction, constraint, and mathematical adjustment required to solve the problem. If you are ready to move forward, we can now transition into a **Pseudocode Generation Phase** or a **Technology Stack Selection Phase**.

---

# PSEUDOCODE: CIRCULAR LAYOUT OPTIMIZER

## 🌐 GLOBAL PARAMETERS & CONSTANTS

```python
// FORCE WEIGHTS (Tuning required based on testing)
K_REPULSION = 10.0    // Weight for overlap force magnitude
K_ANGLE_GUIDANCE = 5.0 // Weight for angular proximity multiplier (Option 1)
K_SPRING = 0.8        // Strength of the "Evenness" pull (Restoring Force)
K_UNIQUE = 0.5        // Strength of minimum separation enforcement

// GEOMETRIC CONSTANTS
MIN_GAP_PIXELS = 2    // Required non-overlap gap size (S_ij &gt;= 2)
ANGULAR_EPSILON = 1.0 // Small angle to prevent division by zero in trig functions
ANGLE_MIN_SEPARATION = 5.0 // Minimum allowed angular distance between paths
PIXEL_CANVAS_SIZE = 200

// OPTIMIZATION CONTROL
MAX_ITERATIONS = 1000
CONVERGENCE_THRESHOLD = 0.001 // Average force magnitude below this means equilibrium reached
TIME_STEP_DT = 0.5           // Time step size for the simulation update (Delta t)
```

## 📐 HELPER FUNCTIONS (Requires Geometric Libraries)

### `FUNCTION Get_Overlap_Pixels(PathA, PathB, AngleA, AngleB)`

- **Input:** Two path geometries and their proposed angles.
- **Process:** Renders both paths onto the $200 \times 200$ canvas using the given angles. Counts shared pixels (Intersection Area).
- **Output:** Integer $S_{ij}$ (Overlap Pixel Count).

### `FUNCTION Calculate_Angular_Distance(AngleA, AngleB)`

- **Input:** Two angles ($\theta_a, \theta_b$).
- **Process:** Returns the smallest angular distance between them on a circle ($0^\circ$ to $180^\circ$).
- **Output:** Float $\Delta\theta$.

### `FUNCTION Get_Directional_Shift(PathA, PathB, CurrentAngleA, CurrentAngleB)`

- **Input:** Paths and current angles.
- **Process:** A localized search (simulated annealing or gradient descent over small angular steps) to determine the single best direction ($\pm \delta$) for $P_A$ that minimizes the overlap with $P_B$.
- **Output:** Tuple $(\Delta\Theta, M)$ where $\Delta\Theta$ is the optimal directional shift in degrees, and $M$ is the resulting minimal overlap magnitude.

## 🚀 MAIN ALGORITHM FUNCTION

```python
FUNCTION Initialize_Layout(Paths):
    N = len(Paths)
    CurrentAngles = []  # Stores {PathId: Angle}

    // Initial State: Assign random unique angles (0 to 360 degrees)
    for i in range(N):
        random_angle = RANDOM_FLOAT(ANGLE_MIN_SEPARATION * i + ANGLE_EPSILON, 360.0)
        CurrentAngles.append({'path': Paths[i], 'angle': random_angle})

    return CurrentAngles

FUNCTION Simulate_Layout(Paths):
    CurrentState = Initialize_Layout(Paths)

    for iteration in range(MAX_ITERATIONS):
        TotalForces = {}  # Stores total directional shift for each path

        // --- 1. CALCULATE ALL FORCE COMPONENTS ---
        for i in range(N):
            P_i = Paths[i]
            Angle_i = CurrentState[i]['angle']

            TotalForces[i] = {'overlap': 0.0, 'restoring': 0.0, 'unique': 0.0}

            // A. Overlap & Unique Force Calculation (Iterate over all other paths j)
            for j in range(N):
                if i == j: continue
                P_j = Paths[j]
                Angle_j = CurrentState[j]['angle']

                # 1. Calculate Physical Overlap S_ij
                S_ij = Get_Overlap_Pixels(P_i, P_j, Angle_i, Angle_j)

                // 2. Directional Repulsion (Uses the specialized directional search function)
                if S_ij &gt;= MIN_GAP_PIXELS:
                    (DeltaTheta_overlap, _) = Get_Directional_Shift(P_i, P_j, Angle_i, Angle_j)
                    # Add this calculated shift to the total overlap force for Pi
                    TotalForces[i]['overlap'] += DeltaTheta_overlap

                // 3. Unique Anti-Collision Force (Simpler calculation based on angular distance)
                DeltaTheta_unique = Calculate_Angular_Distance(Angle_i, Angle_j)
                if DeltaTheta_unique &lt; ANGLE_MIN_SEPARATION:
                    # Apply a simple repulsion proportional to the violation amount
                    force_magnitude = K_UNIQUE * (ANGLE_MIN_SEPARATION - DeltaTheta_unique)
                    # Determine directionality here based on which side is most restrictive
                    TotalForces[i]['unique'] += CALCULATE_DIRECTIONAL_PUSH(Angle_j, Angle_i, force_magnitude)


        // B. Restoring Force (Global Gap Check)
        SortedPaths = Sort_By_Angle(CurrentState)
        DeltaTheta_restoring = Calculate_Restorative_Shift(N, SortedPaths)
        for i in range(N):
            TotalForces[i]['restoring'] += DeltaTheta_restoring[i]

        // C. SUMMATION AND UPDATE (Integration Step)
        AverageTotalForceMagnitude = 0.0
        NewState = {}

        for i in range(N):
            # Total directional shift is the weighted sum of all required shifts
            DeltaTheta_total = (K_REPULSION * TotalForces[i]['overlap']) + \
                               (K_SPRING * TotalForces[i]['restoring']) + \
                               (W_unique * TotalForces[i]['unique'])

            # Update angle using Euler integration and damping
            NewAngle_raw = CurrentState[i]['angle'] + (DeltaTheta_total * TIME_STEP_DT)
            NewAngle = Normalize(NewAngle_raw) # Wraps the angle back into [0, 360]

            # Update state and track force magnitude for convergence check
            CurrentState[i]['angle'] = NewAngle
            AverageTotalForceMagnitude += ABSOLUTE_VALUE(DeltaTheta_total)

        // D. Check Convergence (End of Loop Logic)
        if iteration &gt; 0 and AverageTotalForceMagnitude &lt; CONVERGENCE_THRESHOLD:
            PRINT "Convergence reached at iteration:", iteration
            break

    return CurrentState

```

### Key Implementation Notes for the Developer:

1.  **Normalization:** The `Normalize(angle)` function is essential: `new_angle = angle % 360`.
2.  **Directionality Handling:** The functions `Get_Directional_Shift` and `Calculate_Restorative_Shift` are the most complex parts, as they must output an actual angular shift (e.g., $+15^\circ$ or $-8^\circ$) rather than just a magnitude.
3.  **Tuning is Paramount:** The weight constants ($K_{\text{rep}}, K_{\text{spring}}$, etc.) and the time step $\Delta t$ will require extensive iterative tuning to ensure stability (preventing wild oscillations) and successful convergence.

# 📐 PSEUDOCODE DETAIL 1: Directional Overlap Shift

**FUNCTION `Get_Directional_Shift(PathA, PathB, CurrentAngleA, CurrentAngleB)`**

- **Input:** Two path geometries ($P_A, P_B$) and their current angles ($\theta_A, \theta_B$).
- **Output:** Tuple $(\Delta\Theta, M)$ where $\Delta\Theta$ is the optimal directional shift for $P_A$ (in degrees), and $M$ is the resulting overlap magnitude after that shift.

```pseudocode
// --- PARAMETERS ---
SMALL_TEST_STEP = 0.5 // Small angular step size used for searching direction
MIN_OVERLAP_THRESHOLD = 2 // Must still ensure minimum gap if possible

// --- INITIALIZATION ---
CurrentOverlap_Magnitude = Get_Overlap_Pixels(P_A, P_B, CurrentAngleA, CurrentAngleB)

IF CurrentOverlap_Magnitude &lt; MIN_OVERLAP_THRESHOLD:
    RETURN (0.0, 0.0) // No significant overlap found; no directional force needed


// --- LOCALIZED SEARCH LOOP ---
BestShift = 0.0
MinOverlapFound = CurrentOverlap_Magnitude

// We test both positive (CCW) and negative (CW) shifts for Path A
FOR Direction in [+1, -1]:
    CurrentTestAngleA = CurrentAngleA + (Direction * SMALL_TEST_STEP)

    // 1. Calculate Overlap at the Test Angle
    Overlapped_Pixels = Get_Overlap_Pixels(P_A, P_B, CurrentTestAngleA, CurrentAngleB)

    // 2. Check for improvement: Did this shift significantly reduce overlap?
    IF Overlapped_Pixels &lt; MinOverlapFound:
        MinOverlapFound = Overlapped_Pixels
        BestShift = Direction * SMALL_TEST_STEP

// --- FINAL OUTPUT ---
FinalOverlapMagnitude = MinOverlapFound
RETURN (BestShift, FinalOverlapMagnitude)
```

### Logic Breakdown:

The function performs a localized search. It tests small steps ($\pm \delta$) in both directions for $P_A$. The best shift is simply the one that results in the smallest measured overlap area ($S_{ij}$). This guarantees that the calculated directional push points the path directly out of the conflict zone.

---

# 📐 PSEUDOCODE DETAIL 2: Restorative Shift Calculation (The Global Guide)

**FUNCTION `Calculate_Restorative_Shift(N, SortedPaths)`**

- **Input:** $N$ (total number of paths), and `SortedPaths` (a list of all path objects sorted by their current angle).
- **Output:** Dictionary mapping each Path ID to a required directional shift $\Delta\Theta_{i}$.

```pseudocode
// --- INITIALIZATION ---
IdealGap = 360.0 / N
TotalRestoringShift = {} // Will hold the calculated directional push for every path ID

// Loop through all paths, considering neighbors
FOR i in range(N):
    P_A = SortedPaths[i]       // Current Path P_i (The focal point)
    Path_ID_A = P_A.id
    Angle_A = P_A.angle
    Shift_Contribution_A = 0.0

    // --- Neighbor A (Preceding Neighbor in the Sorted List) ---
    if i == 0:
        // Wrap-around case: The neighbor is the last element in the list
        P_Neighbor_A = SortedPaths[N - 1]
        Angle_Neighbor_A = P_Neighbor_A.angle
        Neighbor_ID_A = P_Neighbor_A.id
    else:
        // Normal case
        P_Neighbor_A = SortedPaths[i - 1]
        Angle_Neighbor_A = P_Neighbor_A.angle
        Neighbor_ID_A = P_Neighbor_A.id


    // --- Neighbor B (Succeeding Neighbor) ---
    if i == N - 1:
        // Wrap-around case: The neighbor is the first element in the list
        P_Neighbor_B = SortedPaths[0]
        Angle_Neighbor_B = P_Neighbor_B.angle
        Neighbor_ID_B = P_Neighbor_B.id
    else:
        // Normal case
        P_Neighbor_B = SortedPaths[i + 1]
        Angle_Neighbor_B = P_Neighbor_B.angle
        Neighbor_ID_B = P_Neighbor_B.id


    // --- CALCULATE GAP DEVIATIONS AND SHIFTS ---

    // 1. Calculate Gap with Preceding Neighbor A
    Gap_A = Angle_A - Angle_Neighbor_A // Simple subtraction is okay since the list is sorted
    Deviation_A = ABS(Gap_A - IdealGap)

    if Deviation_A &gt; THRESHOLD: // If gap deviates too much, a restorative force is needed
        Force_Strength = K_SPRING * (IdealGap - Gap_A)
        // Directional Push: Needs to push P_i away from Neighbor A's position.
        // Since Angle_A comes after Angle_Neighbor_A, we need a positive shift.
        Shift_Contribution_A += Force_Strength


    // 2. Calculate Gap with Succeeding Neighbor B
    Gap_B = (Angle_Neighbor_B - Angle_A) // Handling the angular difference across 360
    Deviation_B = ABS(Gap_B - IdealGap)

    if Deviation_B &gt; THRESHOLD:
        Force_Strength = K_SPRING * (IdealGap - Gap_B)
        // Directional Push: Needs to push P_i away from Neighbor B's position.
        // Since Angle_A comes before Angle_Neighbor_B, we need a negative shift.
        Shift_Contribution_A -= Force_Strength


    TotalRestoringShift[Path_ID_A] = Shift_Contribution_A

RETURN TotalRestoringShift
```
