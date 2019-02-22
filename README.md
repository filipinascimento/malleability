#Malleability

For a given state of a dynamical system, represented by a complex network (topology), it is interesting to quantify the number of new possible topologies that can be obtained from the current state as a consequence of modifications/perturbations induced by some dynamics acting on the network topology. An example is the number of different power grid networks that will result after one connection is removed. An approach to this type of quantification was recently proposed by Costa's group and is called Malleability.

This type of representation involves two main aspects: the structure of the network and a given dynamics, which modifies the network structure. In order to quantify the evolution of this type of network, the malleability measurement can be employed, which is based on the effective number of network variations of the original network. Malleability is defined as the measurement of the Diversity index of the transition probabilities of each possible network variation when a given dynamics is employed. More specifically, the Diversity index is computed as the exponential of the entropy of the transition probabilities. So, the malleability increases when the effective number of network variations increases.

The transition probabilities can be computed from the number of isomorphic graphs found for the variation of the original network. See the examples for a dynamics that consists of erasing a single edge from the network. 

![](/images/example1.png)

In this example, because of all possibilities of edge remotion lead to the same variation, the calculated malleability is 1.0.

Taking another example, in which the dynamics of edge remotion leads to some variations of the network

![](/images/example2.png)

In this case, the calculated malleability is approximately 1.89.

Due to the high computational cost to compute the isomorphisms, it is reasonable to approximate this measurement. One possibility is to find network distinctions from centrality measurements (e.g., node degree, clustering coefficient, and average shortest paths). If the measurements return the same value for two networks, they are considered isomorphic. The advantage of employing this approach is that the malleability of the network can be measured from a given characteristic that is being analyzed. For example, if the network is analyzed in terms of the number of nodes connected as triples (i.e., connected triangles), the global transitivity can be employed.

More details are available at https://arxiv.org/abs/1810.09602. 
